import type { CampaignFormInput } from "@/domain/campaign-form-schema";

/**
 * Slice 6 evaluation fixture definitions — version-controlled, no live data.
 * The creation/teardown script (scripts/eval-slice-6.ts) reads these to
 * build real BrandProfile/SegmentCard/Campaign rows and drive real Claude
 * generations. Every factual/commercial field here is explicit and
 * confirmed — nothing is left for the model to infer or invent.
 */

export type EvalBrandDefinition = {
  key: "northstar_cloud" | "harvest_co" | "roots_forward";
  name: string;
  logoFixtureFile: string;
  heroFixtureFile: string;
  colors: { primary: string };
  tone: string[];
  voiceNotes: string;
  preferredTerms: string[];
  prohibitedTerms: string[];
  defaultCtaStyle: "filled" | "outline";
  defaultFooterHtml: string;
};

export const EVAL_BRANDS: EvalBrandDefinition[] = [
  {
    key: "northstar_cloud",
    name: "[Eval] Northstar Cloud",
    logoFixtureFile: "northstar-cloud-logo.png",
    heroFixtureFile: "northstar-cloud-hero.png",
    colors: { primary: "#2563EB" },
    tone: ["Professional", "Direct"],
    voiceNotes: "SaaS product for engineering teams. Confident, precise, no hype.",
    preferredTerms: ["workspace", "teams"],
    prohibitedTerms: ["synergy"],
    defaultCtaStyle: "filled",
    defaultFooterHtml: "Northstar Cloud, Inc. · 100 Market St, San Francisco, CA · Unsubscribe",
  },
  {
    key: "harvest_co",
    name: "[Eval] Harvest & Co",
    logoFixtureFile: "harvest-co-logo.png",
    heroFixtureFile: "harvest-co-hero.png",
    colors: { primary: "#EA580C" },
    tone: ["Friendly", "Casual"],
    voiceNotes: "Direct-to-consumer food/goods brand. Warm, upbeat, conversational.",
    preferredTerms: ["fresh", "delivered"],
    prohibitedTerms: ["cheap"],
    defaultCtaStyle: "filled",
    defaultFooterHtml: "Harvest & Co · 42 Orchard Lane, Austin, TX · Unsubscribe",
  },
  {
    key: "roots_forward",
    name: "[Eval] Roots Forward",
    logoFixtureFile: "roots-forward-logo.png",
    heroFixtureFile: "roots-forward-hero.png",
    colors: { primary: "#15803D" },
    tone: ["Empathetic", "Inspiring"],
    voiceNotes: "Community/environmental nonprofit. Warm, hopeful, never guilt-driven.",
    preferredTerms: ["community", "together"],
    prohibitedTerms: ["urgent"],
    defaultCtaStyle: "outline",
    defaultFooterHtml: "Roots Forward is a 501(c)(3) nonprofit · Unsubscribe",
  },
];

export type EvalSegmentKey = "new_customer" | "lapsed_customer";

export const EVAL_SEGMENTS: Record<
  EvalSegmentKey,
  Pick<
    CampaignFormInput["segmentCard"],
    "name" | "lifecycleStage" | "primaryMotivation" | "primaryObjection" | "desiredAction"
  >
> = {
  new_customer: {
    name: "[Eval] New customer",
    lifecycleStage: "new_customer",
    primaryMotivation: "Recently signed up or purchased and wants to get value quickly.",
    primaryObjection: "Hasn't built a habit yet — unsure this is worth their ongoing attention.",
    desiredAction: "Take the next concrete step to get value from what they just joined.",
  },
  lapsed_customer: {
    name: "[Eval] Lapsed customer",
    lifecycleStage: "lapsed_customer",
    primaryMotivation: "Used the product/brand before, drifted away, open to a reason to return.",
    primaryObjection: "Forgot why they left, or assumes nothing has changed since.",
    desiredAction: "Come back and re-engage with a specific, low-friction reason.",
  },
};

export type EvalCombination = {
  id: string;
  brand: EvalBrandDefinition["key"];
  segment: EvalSegmentKey;
  campaign: Omit<
    CampaignFormInput,
    "brandProfileId" | "segmentCard" | "images"
  >;
  /** True only for the deliberate nonprofit/promotion tone stress case. */
  isStressCase?: boolean;
};

const CTA_BY_BRAND: Record<EvalBrandDefinition["key"], { label: string; url: string }> = {
  northstar_cloud: { label: "Open Northstar Cloud", url: "https://app.northstarcloud.example.com" },
  harvest_co: { label: "Shop the harvest", url: "https://harvestandco.example.com/shop" },
  roots_forward: { label: "Join Roots Forward", url: "https://rootsforward.example.org/join" },
};

function cta(brand: EvalBrandDefinition["key"]) {
  return CTA_BY_BRAND[brand];
}

/**
 * 18 hand-picked (brand, campaign type, layout, segment) combinations — not
 * the full 3x5x2x4 cross product. Selected so every layout appears at least
 * 3 times (once per brand), every brand covers at least 2 campaign types,
 * and every segment appears with at least 2 brands. One deliberate tone
 * stress case: a nonprofit running a "promotion_offer" layout.
 */
export const EVAL_COMBINATIONS: EvalCombination[] = [
  // Northstar Cloud (SaaS) — feature_launch/hero_cta, webinar, announcement, promotion, newsletter
  {
    id: "nc-01-feature-new",
    brand: "northstar_cloud",
    segment: "new_customer",
    campaign: {
      name: "[Eval] NC Feature Launch — New Customer",
      campaignType: "feature_launch",
      objective: "activation",
      brief: "Announce the new saved-views feature to recently onboarded teams.",
      facts: {
        productOrFeatureName: "Saved Views",
        ctaLabel: cta("northstar_cloud").label,
        ctaUrl: cta("northstar_cloud").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "hero_cta",
    },
  },
  {
    id: "nc-02-webinar-lapsed",
    brand: "northstar_cloud",
    segment: "lapsed_customer",
    campaign: {
      name: "[Eval] NC Webinar — Lapsed Customer",
      campaignType: "webinar",
      objective: "registrations",
      brief: "Invite lapsed users back via a live product roadmap webinar.",
      facts: {
        eventDateText: "October 14, 2026",
        eventTimeText: "11:00 AM ET",
        speakerText: "Priya Nair, Head of Product",
        ctaLabel: cta("northstar_cloud").label,
        ctaUrl: cta("northstar_cloud").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "webinar_event",
    },
  },
  {
    id: "nc-03-announcement-new",
    brand: "northstar_cloud",
    segment: "new_customer",
    campaign: {
      name: "[Eval] NC Announcement — New Customer",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Announce SOC 2 Type II certification to recently onboarded teams.",
      facts: {
        productOrFeatureName: "SOC 2 Type II certification",
        ctaLabel: cta("northstar_cloud").label,
        ctaUrl: cta("northstar_cloud").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },
  {
    id: "nc-04-promotion-lapsed",
    brand: "northstar_cloud",
    segment: "lapsed_customer",
    campaign: {
      name: "[Eval] NC Promotion — Lapsed Customer",
      campaignType: "promotion",
      objective: "activation",
      brief: "Win back lapsed accounts with a limited-time discount on annual plans.",
      facts: {
        offerText: "20% off your first year back",
        discountText: "20% off annual plans",
        endDateText: "October 31, 2026",
        ctaLabel: cta("northstar_cloud").label,
        ctaUrl: cta("northstar_cloud").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "promotion_offer",
    },
  },
  {
    id: "nc-05-newsletter-new",
    brand: "northstar_cloud",
    segment: "new_customer",
    campaign: {
      name: "[Eval] NC Newsletter — New Customer",
      campaignType: "newsletter",
      objective: "awareness",
      brief: "Monthly product update roundup for teams in their first 90 days.",
      facts: {
        ctaLabel: cta("northstar_cloud").label,
        ctaUrl: cta("northstar_cloud").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },

  // Harvest & Co (e-commerce) — feature_launch, webinar(rare but valid), announcement, promotion, newsletter
  {
    id: "hc-01-feature-new",
    brand: "harvest_co",
    segment: "new_customer",
    campaign: {
      name: "[Eval] HC Feature Launch — New Customer",
      campaignType: "feature_launch",
      objective: "activation",
      brief: "Introduce the new subscription box option to first-time buyers.",
      facts: {
        productOrFeatureName: "Weekly Harvest Box subscription",
        ctaLabel: cta("harvest_co").label,
        ctaUrl: cta("harvest_co").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "hero_cta",
    },
  },
  {
    id: "hc-02-announcement-lapsed",
    brand: "harvest_co",
    segment: "lapsed_customer",
    campaign: {
      name: "[Eval] HC Announcement — Lapsed Customer",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Tell past customers about new local farm partners this season.",
      facts: {
        productOrFeatureName: "3 new local farm partners",
        ctaLabel: cta("harvest_co").label,
        ctaUrl: cta("harvest_co").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },
  {
    id: "hc-03-promotion-new",
    brand: "harvest_co",
    segment: "new_customer",
    campaign: {
      name: "[Eval] HC Promotion — New Customer",
      campaignType: "promotion",
      objective: "purchase",
      brief: "First-order discount for people who just created an account.",
      facts: {
        offerText: "15% off your first box",
        discountText: "15% off",
        eligibilityText: "First-time customers only",
        ctaLabel: cta("harvest_co").label,
        ctaUrl: cta("harvest_co").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "promotion_offer",
    },
  },
  {
    id: "hc-04-newsletter-lapsed",
    brand: "harvest_co",
    segment: "lapsed_customer",
    campaign: {
      name: "[Eval] HC Newsletter — Lapsed Customer",
      campaignType: "newsletter",
      objective: "awareness",
      brief: "Seasonal roundup email to re-engage past subscribers.",
      facts: {
        ctaLabel: cta("harvest_co").label,
        ctaUrl: cta("harvest_co").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },
  {
    id: "hc-05-webinar-new",
    brand: "harvest_co",
    segment: "new_customer",
    campaign: {
      name: "[Eval] HC Webinar — New Customer",
      campaignType: "webinar",
      objective: "registrations",
      brief: "Live cooking demo webinar using this month's harvest box contents.",
      facts: {
        eventDateText: "October 9, 2026",
        eventTimeText: "6:00 PM ET",
        speakerText: "Chef Dana Ruiz",
        ctaLabel: cta("harvest_co").label,
        ctaUrl: cta("harvest_co").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "webinar_event",
    },
  },

  // Roots Forward (nonprofit) — announcement, webinar, feature_launch(program), promotion(STRESS CASE), newsletter
  {
    id: "rf-01-announcement-new",
    brand: "roots_forward",
    segment: "new_customer",
    campaign: {
      name: "[Eval] RF Announcement — New Customer",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Welcome new members and share this quarter's community impact.",
      facts: {
        productOrFeatureName: "Q3 community impact report",
        ctaLabel: cta("roots_forward").label,
        ctaUrl: cta("roots_forward").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },
  {
    id: "rf-02-webinar-lapsed",
    brand: "roots_forward",
    segment: "lapsed_customer",
    campaign: {
      name: "[Eval] RF Webinar — Lapsed Customer",
      campaignType: "webinar",
      objective: "registrations",
      brief: "Invite past volunteers back to a community info session.",
      facts: {
        eventDateText: "October 21, 2026",
        eventTimeText: "5:30 PM ET",
        speakerText: "Marcus Webb, Program Director",
        ctaLabel: cta("roots_forward").label,
        ctaUrl: cta("roots_forward").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "webinar_event",
    },
  },
  {
    id: "rf-03-feature-new",
    brand: "roots_forward",
    segment: "new_customer",
    campaign: {
      name: "[Eval] RF Program Launch — New Customer",
      campaignType: "feature_launch",
      objective: "activation",
      brief: "Introduce new members to the new neighborhood garden program.",
      facts: {
        productOrFeatureName: "Neighborhood Garden Program",
        ctaLabel: cta("roots_forward").label,
        ctaUrl: cta("roots_forward").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "hero_cta",
    },
  },
  {
    id: "rf-04-promotion-lapsed-STRESS",
    brand: "roots_forward",
    segment: "lapsed_customer",
    isStressCase: true,
    campaign: {
      name: "[Eval] RF Promotion (STRESS CASE) — Lapsed Customer",
      campaignType: "promotion",
      objective: "activation",
      // Deliberate stress case: nonprofit + promotion_offer layout.
      // "Discount" doesn't map cleanly onto nonprofit messaging — this
      // tests whether tone/copy stays empathetic rather than sounding like
      // a retail sale when forced into a commerce-shaped layout.
      brief: "Matched-donation offer for lapsed donors: every dollar doubled this month.",
      facts: {
        offerText: "Every donation matched dollar-for-dollar this month",
        discountText: "100% match, up to $50,000 total",
        endDateText: "October 31, 2026",
        ctaLabel: cta("roots_forward").label,
        ctaUrl: cta("roots_forward").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "promotion_offer",
    },
  },
  {
    id: "rf-05-newsletter-new",
    brand: "roots_forward",
    segment: "new_customer",
    campaign: {
      name: "[Eval] RF Newsletter — New Customer",
      campaignType: "newsletter",
      objective: "awareness",
      brief: "Monthly newsletter welcoming new members with community stories.",
      facts: {
        ctaLabel: cta("roots_forward").label,
        ctaUrl: cta("roots_forward").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },

  // 3 extra combinations to round out to 18 and cover remaining layout/type
  // gaps not yet hit for each brand (Northstar: webinar+lapsed already
  // covered; add a second promotion+hero_cta style combination each brand
  // is missing coverage for).
  {
    id: "nc-06-feature-lapsed",
    brand: "northstar_cloud",
    segment: "lapsed_customer",
    campaign: {
      name: "[Eval] NC Feature Launch — Lapsed Customer",
      campaignType: "feature_launch",
      objective: "activation",
      brief: "Re-introduce lapsed users to the new automation feature.",
      facts: {
        productOrFeatureName: "Workflow Automations",
        ctaLabel: cta("northstar_cloud").label,
        ctaUrl: cta("northstar_cloud").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "hero_cta",
    },
  },
  {
    id: "hc-06-announcement-new",
    brand: "harvest_co",
    segment: "new_customer",
    campaign: {
      name: "[Eval] HC Announcement — New Customer",
      campaignType: "announcement",
      objective: "awareness",
      brief: "Welcome new customers and explain how box delivery works.",
      facts: {
        productOrFeatureName: "How your first box works",
        ctaLabel: cta("harvest_co").label,
        ctaUrl: cta("harvest_co").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "text_announcement",
    },
  },
  {
    id: "rf-06-promotion-new",
    brand: "roots_forward",
    segment: "new_customer",
    campaign: {
      name: "[Eval] RF Promotion — New Customer",
      campaignType: "promotion",
      objective: "activation",
      brief: "First-time donor matched-gift offer for new members.",
      facts: {
        offerText: "Your first gift matched dollar-for-dollar",
        discountText: "100% match on first gift, up to $100",
        ctaLabel: cta("roots_forward").label,
        ctaUrl: cta("roots_forward").url,
        requiredClaims: [],
        requiredTerms: [],
        prohibitedClaims: [],
      },
      selectedLayoutId: "promotion_offer",
    },
  },
];
