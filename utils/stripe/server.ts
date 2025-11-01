'use server';

import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
// import { createOrRetrieveCustomer, supabaseAdmin } from '@/utils/supabase/admin'; // <-- Commented out import
import { supabaseAdmin } from '@/utils/supabase/admin'; // <-- Keep supabaseAdmin import if needed elsewhere
import {
    getURL,
    getErrorRedirect,
    calculateTrialEndUnixTimestamp
} from '@/utils/helpers';
import { Tables } from '@/types/database.types';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

type Price = Tables<'prices'>;

export async function checkoutWithStripe(
    price: Price,
    redirectPath: string = '/',
    referralId?: string,
    referral?: string
) {
    try {
        // Get the user from Supabase auth
        const user = await currentUser()

        if (referralId) {
            console.log("checkout with referral id:", referralId)
        }

        if (!user) {
            throw new Error('Could not get user session.');
        }

        // --- Temporarily comment out customer retrieval/creation --- 
        /*
        let customer: string;
        try {
            // customer = await createOrRetrieveCustomer({
            //     uuid: user.id || '',
            //     email: user?.primaryEmailAddress?.emailAddress || '',
            //     referral: referralId
            // });
            throw new Error('createOrRetrieveCustomer is not defined or implemented yet.'); // Placeholder error
        } catch (err) {
            console.error(err);
            throw new Error('Unable to access customer record.');
        }
        */
       // --- End temporary comment out ---
       const customer = "cus_placeholder"; // Temporary placeholder

        const referralMetadata = referral || referralId ? {
            metadata: {
                referral: referral || null,
                referral_id: referralId || null
            }
        } : {}

        let params: Stripe.Checkout.SessionCreateParams = {
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            customer, // Use placeholder customer for now
            customer_update: {
                address: 'auto'
            },
            line_items: [
                {
                    price: price.id,
                    quantity: 1
                }
            ],
            cancel_url: getURL(),
            success_url: getURL(redirectPath),
            client_reference_id: referralId,
            ...referralMetadata
        };

        if (price.type === 'recurring') {
            params = {
                ...params,
                mode: 'subscription',
                subscription_data: {
                    trial_end: calculateTrialEndUnixTimestamp(price.trial_period_days),
                    ...referralMetadata
                }
            };
        } else if (price.type === 'one_time') {
            params = {
                ...params,
                mode: 'payment'
            };
        }

        // Create a checkout session in Stripe
        let session: Stripe.Checkout.Session
        try {
            session = await stripe.checkout.sessions.create(params);
        } catch (err) {
            console.error(err);
            throw new Error('Unable to create checkout session.');
        }

        // Instead of returning a Response, just return the data or error.
        if (session) {
            return session
        } else {
            throw new Error('Unable to create checkout session.');
        }
    } catch (error) {
        if (error instanceof Error) {
            return {
                errorRedirect: getErrorRedirect(
                    redirectPath,
                    error.message,
                    'Please try again later or contact a system administrator.'
                )
            };
        } else {
            return {
                errorRedirect: getErrorRedirect(
                    redirectPath,
                    'An unknown error occurred.',
                    'Please try again later or contact a system administrator.'
                )
            };
        }
    }
}

export async function createStripePortal(currentPath: string) {
    try {
        const { userId } = await auth();

        if (!userId) {
            throw new Error('Could not get user session.');
        }

        // Fetch user profile to get email
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
        });

        // Use primary email from Clerk webhook sync if available, fallback if needed
        const userEmail = profile?.email || '';

        if (!profile) {
            console.error(`Could not find profile for user ${userId}.`);
            throw new Error('User profile not found.');
        }

        // --- Temporarily comment out customer retrieval/creation --- 
        /*
        let customer;
        try {
            // customer = await createOrRetrieveCustomer({
            //     uuid: userId, 
            //     email: userEmail 
            // });
            throw new Error('createOrRetrieveCustomer is not defined or implemented yet.'); // Placeholder error
        } catch (err) {
            console.error(err);
            throw new Error('Unable to access customer record.');
        }

        if (!customer) {
            throw new Error('Could not get customer.');
        }

        try {
            const { url } = await stripe.billingPortal.sessions.create({
                customer, // This needs the customer ID
                return_url: getURL('/account')
            });
            if (!url) {
                throw new Error('Could not create billing portal');
            }
            return url;
        } catch (err) {
            console.error(err);
            throw new Error('Could not create billing portal');
        }
        */
        // --- End temporary comment out --- 
        
        // Placeholder return until customer logic is restored
        console.warn("Stripe customer retrieval/creation logic is commented out in createStripePortal.");
        throw new Error("Stripe portal creation temporarily disabled.");

    } catch (error) {
        if (error instanceof Error) {
            console.error(error);
            return getErrorRedirect(
                currentPath,
                error.message,
                'Please try again later or contact a system administrator.'
            );
        } else {
            return getErrorRedirect(
                currentPath,
                'An unknown error occurred.',
                'Please try again later or contact a system administrator.'
            );
        }
    }
}

export async function createBillingPortalSession() {
    try {
        const user = await currentUser()

        if (!user) {
            throw new Error("No User")
        }

        const { data: customer, error } = await supabaseAdmin.from("customers").select("*").eq("id", user.id).maybeSingle()

        if (error) {
            throw error
        }

        // Create a billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: customer?.stripe_customer_id!,
            return_url: getURL('/settings'), // URL to redirect after the session
        });

        // Return the session URL
        return session.url;
    } catch (error) {
        console.error('Error creating billing portal session:', error);
        return {
            error: "Error creating billing portal session"
        }
    }
}