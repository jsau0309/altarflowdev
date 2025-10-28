# 🚀 Quick Start - What You Need To Do NOW

## ⏱️ **DO THIS FIRST** (5 minutes)

### 1. Add Environment Variable in Vercel
```
1. Go to https://vercel.com/audev/altarflowdev/settings/environment-variables
2. Click "Add New"
3. Key: NEXT_PUBLIC_STRIPE_PROMO_CODE
4. Value: 50OFF3MONTHS
5. Select: Production ✓ Preview ✓ Development ✓
6. Click "Save"
7. Go to Deployments → Click ⋮ on latest → "Redeploy"
```

### 2. Create Stripe Coupon
```
1. Go to https://dashboard.stripe.com (Switch to LIVE mode)
2. Products → Coupons → Create coupon
3. Settings:
   - Name: 50% Off for 3 Months
   - ID: 50OFF3MONTHS (EXACT - don't change)
   - Type: Percentage
   - Percentage: 50
   - Duration: Repeating
   - Months: 3
   - Applies to: ✓ Monthly subscription ✓ Annual subscription
4. Click "Create coupon"
```

---

## ✅ **THEN TEST** (10 minutes)

### 3. Create Test Organization
```
1. Go to your production site
2. Create a new organization
3. CHECK:
   ✓ Green trial banner appears on Dashboard
   ✓ Shows "30 days remaining"
   ✓ Settings shows "Free Trial" badge
   ✓ All features work (Donations, Expenses, Reports)
```

---

## 📋 **COMPLETE CHECKLIST**

See `POST_DEPLOYMENT_CHECKLIST.md` for the full detailed checklist.

---

## 🚨 **IF SOMETHING BREAKS**

### Rollback:
```
1. Vercel → Deployments → Previous deployment → ⋮ → "Promote to Production"
```

### Emergency Contacts:
- GitHub Issues: https://github.com/jsau0309/altarflowdev/issues
- Vercel Support: https://vercel.com/support
- Stripe Support: https://support.stripe.com

---

## ✅ **Expected Behavior**

**For all NEW organizations created after deployment:**
- ✅ Automatically start with 30-day free trial
- ✅ Full premium access (no "upgrade" blocks)
- ✅ Trial countdown visible on Dashboard
- ✅ "Free Trial" badge in Settings
- ✅ Promotional offer shows when they click "Upgrade"

**For EXISTING organizations:**
- ✅ No changes (remain on current plan)
- ✅ Free users stay free
- ✅ Paid users stay paid

---

## 📊 **What Changed**

1. **New churches auto-start trial** (via Clerk webhook)
2. **Dashboard shows trial banner** (green countdown)
3. **Settings shows trial badge**
4. **Database has 6 new fields** (migration auto-applied by Vercel)
5. **Promotional coupon auto-applies** on upgrade

---

## 🎯 **Success = This Works**

After completing steps 1-3 above:
- [ ] New org created successfully
- [ ] Trial banner appears
- [ ] 30 days shown
- [ ] All features work
- [ ] No errors in browser console

**If all ✓ above → You're done! 🎉**

---

See `POST_DEPLOYMENT_CHECKLIST.md` for comprehensive monitoring over the next week.
