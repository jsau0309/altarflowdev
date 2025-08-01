"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Mail, UserX } from "lucide-react";
import LoaderOne from "@/components/ui/loader-one";
import { toast } from "sonner";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  membershipStatus: string | null;
  isSubscribed?: boolean;
}

interface MemberSelectorProps {
  selectedMembers: string[];
  onSelectionChange: (members: string[]) => void;
}

export function MemberSelector({ selectedMembers, onSelectionChange }: MemberSelectorProps) {
  const { getToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnsubscribed, setShowUnsubscribed] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/members/with-email-preferences", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      } else {
        throw new Error("Failed to fetch members");
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    // Filter by email availability
    if (!member.email) return false;
    
    // Filter by subscription status
    if (!showUnsubscribed && member.isSubscribed === false) return false;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        member.firstName.toLowerCase().includes(search) ||
        member.lastName.toLowerCase().includes(search) ||
        member.email?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  const subscribedMembers = filteredMembers.filter(m => m.isSubscribed !== false);
  const unsubscribedMembers = filteredMembers.filter(m => m.isSubscribed === false);

  const handleSelectAll = () => {
    const allSubscribedIds = subscribedMembers.map(m => m.id);
    onSelectionChange(allSubscribedIds);
  };

  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  const handleToggleMember = (memberId: string, isSubscribed?: boolean) => {
    if (isSubscribed === false) {
      toast.error("Cannot select unsubscribed members");
      return;
    }

    if (selectedMembers.includes(memberId)) {
      onSelectionChange(selectedMembers.filter(id => id !== memberId));
    } else {
      onSelectionChange([...selectedMembers, memberId]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <LoaderOne />
        </CardContent>
      </Card>
    );
  }

  const membersWithEmail = members.filter(m => m.email);
  const totalSubscribed = membersWithEmail.filter(m => m.isSubscribed !== false).length;

  return (
    <Card>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Select Recipients</CardTitle>
            <CardDescription className="text-sm">
              Choose which members will receive this email
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{membersWithEmail.length}</span>
              <span className="text-muted-foreground">with email</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-green-600" />
              <span className="font-medium">{totalSubscribed}</span>
              <span className="text-muted-foreground">subscribed</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={subscribedMembers.length === 0}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
              disabled={selectedMembers.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-unsubscribed"
            checked={showUnsubscribed}
            onCheckedChange={(checked) => setShowUnsubscribed(checked as boolean)}
          />
          <Label
            htmlFor="show-unsubscribed"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show unsubscribed members
          </Label>
        </div>

        <div className="h-[300px] rounded-md border overflow-y-auto">
          <div className="p-4 space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm 
                  ? "No members found matching your search"
                  : "No members with email addresses found"}
              </div>
            ) : (
              <>
                {subscribedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => handleToggleMember(member.id, member.isSubscribed)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    {member.membershipStatus && (
                      <Badge variant="secondary" className="text-xs">
                        {member.membershipStatus}
                      </Badge>
                    )}
                  </div>
                ))}
                
                {showUnsubscribed && unsubscribedMembers.length > 0 && (
                  <>
                    <div className="py-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Unsubscribed Members
                      </p>
                    </div>
                    {unsubscribedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-3 py-3 px-4 rounded-lg opacity-50"
                      >
                        <Checkbox
                          checked={false}
                          disabled
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate line-through">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          <UserX className="h-3 w-3 mr-1" />
                          Unsubscribed
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {selectedMembers.length} of {subscribedMembers.length} members selected
          </span>
          {selectedMembers.length > 0 && (
            <span className="font-medium text-foreground">
              Email will be sent to {selectedMembers.length} recipient{selectedMembers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}