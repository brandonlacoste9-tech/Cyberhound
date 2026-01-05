# Stripe Payment Integration for Pro Upgrade Flow

## Objective
Transition "Pro" features from a simulated alert() paywall to a functional revenue-generating flow using Stripe Checkout.

## Scope
The integration targets the two primary user conversion points in the Mission Control interface:
1. **Main Dashboard**: The "Unlock Pro Intel" button in the header/controls area (App.tsx).
2. **Mystery Ticker**: The "Pro Clearance" lock overlay on redacted high-value deals (MysteryTicker.tsx).

## Implementation Plan

### Phase 1: Direct Link Integration (Current Focus)
- **Goal**: Immediate ability to accept payments.
- **Method**: Replace alert() dialogs with window.open(STRIPE_URL, '_blank').
- **URL Configuration**:
    - **Development**: Use Test Mode Payment Link (https://buy.stripe.com/7sYfZgdJP9Kdd4i95v1Fe08 or user-provided).
    - **Production**: Replace with Live Mode Payment Link.

### Phase 2: Post-Purchase Experience (Future)
- **Success Handling**: Validating payment completion (via Webhooks or simple redirect checks).
- **Pro State**: Persisting the "Unlocked" state in the user session/local storage.

## Execution Steps
1.  **Define Configuration**: Centralize the Stripe Link URL (or hardcode for MVP).
2.  **Patch App.tsx**: Update triggerPaywall function.
3.  **Patch MysteryTicker.tsx**: Update triggerPaywall function.
4.  **Verification**: Click test to ensure new tab opens correctly.

## Technical Details
- **Trigger Function**: triggerPaywall
- **Action**: window.open()
- **Target**: _blank (New Tab) to preserve dashboard state.
