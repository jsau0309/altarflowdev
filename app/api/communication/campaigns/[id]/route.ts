import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCampaignSchema = z.object({
  subject: z.string().min(1).optional(),
  previewText: z.string().optional(),
  content: z.string().optional(),
  design: z.any().optional(),
  recipientIds: z.array(z.string()).optional(),
  recipientType: z.enum(["all", "selected", "filtered"]).optional(),
  recipientFilters: z.object({
    status: z.string().optional(),
    searchQuery: z.string().optional(),
  }).optional(),
  status: z.enum(["DRAFT", "SCHEDULED"]).optional(),
  scheduledAt: z.string().datetime().optional(),
});

/**
 * Retrieves an email campaign by ID for the authenticated user's organization.
 *
 * Returns campaign details including recipient IDs and design data. Full recipient details are included only if the campaign is not in draft status. Responds with appropriate error messages for unauthorized access, missing church, or campaign not found.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church ID from org
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Get campaign with recipients and more details for sent campaigns
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: id,
        churchId: church.id,
      },
      include: {
        recipients: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Transform the response to include recipient IDs and design
    const campaignData = {
      ...campaign,
      recipientIds: campaign.recipients.map((r) => r.memberId),
      design: campaign.contentJson, // Map contentJson to design for frontend compatibility
      recipients: campaign.status !== "DRAFT" ? campaign.recipients : undefined, // Include full recipient details for non-draft campaigns
    };

    return NextResponse.json(campaignData);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

/**
 * Updates an existing email campaign by ID, allowing changes to campaign details, status, scheduling, and recipients.
 *
 * Only draft campaigns can be edited, except when scheduling. Recipient updates support all members, filtered members, or selected recipients. The total recipient count is updated accordingly. Returns the updated campaign data with recipient IDs.
 *
 * Responds with appropriate error messages and status codes for unauthorized access, invalid data, missing resources, or invalid campaign state.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get church ID from org
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Check if campaign exists and belongs to church
    const existingCampaign = await prisma.emailCampaign.findFirst({
      where: {
        id: id,
        churchId: church.id,
      },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateCampaignSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Only allow editing DRAFT campaigns (unless we're scheduling it)
    if (existingCampaign.status !== "DRAFT" && validation.data.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only edit draft campaigns" },
        { status: 400 }
      );
    }

    const { recipientIds, design, content, status, scheduledAt, recipientType, recipientFilters, ...campaignData } = validation.data;

    // Prepare update data
    const updateData: any = { ...campaignData };
    if (design !== undefined) {
      updateData.contentJson = design;
    }
    if (content !== undefined) {
      updateData.htmlContent = content;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (scheduledAt !== undefined) {
      updateData.scheduledFor = new Date(scheduledAt);
    }
    // Note: recipientType and recipientFilters are not stored in the database
    // They are only used to determine which recipients to create

    // Update campaign in transaction
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      // Update campaign data
      await tx.emailCampaign.update({
        where: { id: id },
        data: updateData,
      });

      // Update recipients if provided
      if (recipientIds !== undefined) {
        // Delete existing recipients
        await tx.emailRecipient.deleteMany({
          where: { campaignId: id },
        });

        // Handle different recipient types
        let actualRecipientIds = recipientIds;
        
        if (recipientType === "all") {
          // Get all members with email addresses
          const allMembers = await tx.member.findMany({
            where: { 
              churchId: church.id,
              email: { not: null }
            },
            select: { id: true },
          });
          actualRecipientIds = allMembers.map(m => m.id);
        } else if (recipientType === "filtered" && recipientFilters) {
          // Fetch members based on filters
          const whereClause: any = { 
            churchId: church.id,
            email: { not: null } // Only include members with email
          };
          
          if (recipientFilters.status && recipientFilters.status !== "all") {
            whereClause.membershipStatus = recipientFilters.status;
          }
          
          if (recipientFilters.searchQuery) {
            whereClause.AND = [
              {
                OR: [
                  { firstName: { contains: recipientFilters.searchQuery, mode: 'insensitive' } },
                  { lastName: { contains: recipientFilters.searchQuery, mode: 'insensitive' } },
                  { email: { contains: recipientFilters.searchQuery, mode: 'insensitive' } },
                ]
              }
            ];
          }
          
          const filteredMembers = await tx.member.findMany({
            where: whereClause,
            select: { id: true },
          });
          
          actualRecipientIds = filteredMembers.map(m => m.id);
        }
        
        // Create new recipients
        if (actualRecipientIds.length > 0) {
          // Fetch member emails
          const members = await tx.member.findMany({
            where: {
              id: { in: actualRecipientIds },
              churchId: church.id,
            },
            select: {
              id: true,
              email: true,
            },
          });

          // Only create recipients for members with email addresses
          const recipientsData = members
            .filter((member) => member.email !== null)
            .map((member) => ({
              campaignId: id,
              memberId: member.id,
              email: member.email!,
            }));

          if (recipientsData.length > 0) {
            await tx.emailRecipient.createMany({
              data: recipientsData,
            });
          }
          
          // Update totalRecipients count
          await tx.emailCampaign.update({
            where: { id: id },
            data: {
              totalRecipients: recipientsData.length,
            },
          });
        } else {
          // If no recipients, set totalRecipients to 0
          await tx.emailCampaign.update({
            where: { id: id },
            data: {
              totalRecipients: 0,
            },
          });
        }
      }

      // Return the updated campaign with fresh data
      const updatedCampaignData = await tx.emailCampaign.findUnique({
        where: { id: id },
        include: {
          recipients: {
            select: {
              memberId: true,
            },
          },
        },
      });

      return updatedCampaignData;
    });

    // Transform the response to include recipient IDs
    const responseData = {
      ...updatedCampaign,
      recipientIds: updatedCampaign?.recipients.map((r) => r.memberId) || [],
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

/**
 * Deletes an email campaign by ID if the authenticated user is an admin and the campaign is not currently sending.
 *
 * Returns a JSON response indicating success or an appropriate error message and status code if deletion is not permitted or fails.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get church ID from org
    const church = await prisma.church.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!church) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }

    // Check if campaign belongs to church and can be deleted
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: id,
        churchId: church.id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "SENDING") {
      return NextResponse.json(
        { error: "Cannot delete a campaign that is currently sending" },
        { status: 400 }
      );
    }

    // Delete campaign (cascade will delete recipients)
    await prisma.emailCampaign.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}