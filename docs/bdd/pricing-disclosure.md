# Feature: Pricing Disclosure

```gherkin
Scenario: Subscription prices and sources are disclosed
  Given the pricing section
  When the visitor views it
  Then each subscription's price, plan, source label, and source link are listed
  And each subscription row shows whether the source is official, a retailer, or an estimate
  And each subscription row shows when the source was last verified
  And each entry shows when the price was last curated

Scenario: Supported subscription tiers are listed
  Given the comparison and pricing sections
  When the visitor views them
  Then the Codex individual plan is listed
  And the Claude Code tiers are listed: Pro monthly, Pro annual, Max 5×, Team standard seat (monthly and annual), and Team premium seat (monthly and annual)
  And the public Claude pricing page also exposes Max 20×, but the calculator keeps it out of the priced rows until a durable standalone public price is available
  And the GitHub Copilot tiers are listed: Free, Pro, Pro+, and Max
  And the GitLab Premium + Duo Agent Platform credits tier is listed
  And the Cursor tiers are listed: Individual, Pro+, Ultra, Teams, and Teams Premium
  And the xAI Grok tiers are listed: SuperGrok and SuperGrok Pro
  And the Zed tiers are listed: Personal, Pro, and Business
  And the Google AI tiers are listed: Plus, Pro, Google AI Ultra 5x, and Google AI Ultra 20x
  And the Amazon Q Developer tiers are listed: Free and Pro
  And the Devin tiers are listed: Free, Pro, Max, and Teams (base + 1 seat)
  And the Devin tiers surface the alias "Devin (Windsurf / Devin Desktop)" without duplicating any rows
  And the Replit tiers are listed: Starter (Free), Core (monthly and annual), and Pro (monthly and annual)
  And the Mistral tiers are listed: Free, Pro, Team, and Education
  And the Bolt tiers are listed: Free, Pro, and Teams
  And the Lovable tiers are listed: Free, Pro, and Business
  And the v0 tiers are listed: Free, Plus, and Business
  And the Augment Code tier is listed: Business
  And the Qodo tiers are listed: Pro Team (2,500 credits), Pro Team (5,000 credits), and Pro Team (20,000 credits)
  And the CodeRabbit tiers are listed: Pro (annual) and Pro Plus (annual)
  And the Kiro tiers are listed: Free, Pro, Pro+, Pro Max, and Power
  And the Supermaven tiers are listed: Free Tier, Pro, and Team
  And the Amp tiers are listed: Megawatt and Gigawatt
  And the TRAE tiers are listed: Lite, Pro, Pro+, and Ultra
  And the Warp tiers are listed: Free, Build, Max, and Business
  And the Warp tiers disclose that AI usage is billed separately from the included monthly credits and that Enterprise is out of scope
  And the JetBrains AI Pro tier is listed at about $16.67/mo effective from $200/year annual billing
  And the Tabnine tiers are listed: Code Assistant Platform and Agentic Platform
  And the Factory tiers are listed: Pro, Plus, and Max
  And the Manus tiers are listed: Standard, Customizable, and Extended
  And each tier is distinguishable by its plan name even when it shares a product name

Scenario: Claude Code Max 20× is exposed but not modeled until a durable public price exists
  Given the Claude Code pricing section
  When the visitor reads the disclosure
  Then it states that the public Claude pricing page exposes Max 20× as a usage option
  And it explains that the calculator only models the publicly visible from $100/mo Max 5× scenario until a verifiable public price exists

Scenario: Claude Code included-value copy names the broader bundle
  Given the Claude Code Pro and Team tiers
  When the visitor views their included-value text
  Then the Pro copy names Claude Code plus Claude Cowork, Claude Design, Claude Science, and Claude for Microsoft 365
  And the Team copy keeps the collaboration and central-billing framing while referring to the broader Claude bundle

Scenario: GitHub Copilot Pro included-value copy names agents, code review, and AI Credit consumption rules
  Given the GitHub Copilot Free, Pro, Pro+, and Max tiers
  When the visitor views the Copilot pricing copy
  Then the Free copy mentions limited chat on lighter models, Copilot CLI, and community support
  And the Pro copy names Cloud agent, code review, model selection, 3rd-party agents like Claude Code and Codex, and GitHub AI Credits
  And the paid Copilot copies say AI Credits are consumed by chat, agent mode, code review, Copilot cloud agent, Copilot CLI, and Copilot Apps while completions and next edit suggestions stay unlimited
  And the Pro copy keeps the bundle-overlap caveat for users who already pay separately for Codex or Claude Code
  And the Pro+ and Max copies keep their higher-tier agent and credit positioning
  And the Max copy includes a source note that the comparison table currently shows $200/mo of AI Credits while the FAQ answer says $100/mo

Scenario: Cursor included-value copy names the current pricing-page benefits
  Given the Cursor Individual, Pro+, Ultra, Teams, and Teams Premium tiers
  When the visitor views their included-value text
  Then the Individual copy names extended Agent limits, generous Grok limits, frontier models, MCPs, skills/hooks, Cloud Agents, and Bugbot on usage-based billing
  And the Pro+ copy keeps the roughly 3× Pro Agent limits framing while naming the broader Cursor bundle of frontier models, MCPs, skills/hooks, Cloud Agents, and Bugbot
  And the Ultra copy keeps the roughly 20× Pro Agent limits and priority frontier-model access framing while naming the broader Cursor bundle
  And the Teams copy keeps the centralized billing, admin, and SSO framing for team seats
  And the Teams Premium copy keeps the stronger team-agent limits framing while naming the broader Cursor bundle

Scenario: xAI Grok tiers are listed as optional comparators with a source caveat
  Given the xAI Grok SuperGrok and SuperGrok Pro tiers
  When the visitor views their included-value text
  Then the SuperGrok copy notes that xAI's public grok.com payload exposes the tier IDs even when the visible pricing text is hydrated
  And the SuperGrok Pro copy keeps the same hydrated payload caveat
  And both tiers are optional and unchecked in the default selection

Scenario: The Supermaven tiers disclose their context window and chat-credit caveat
  Given the Supermaven Free Tier, Pro, and Team tiers
  When the visitor views their billing cadence and included-value text
  Then the Free Tier is priced at $0/mo and names the 1M token context window
  And the Pro tier is priced at $10/mo and includes $5/month in Supermaven Chat credits
  And the Team tier is priced at $10/user/mo and includes centralized user management and billing
  And the paid tiers avoid implying unlimited usage from the flat monthly price

Scenario: Devin Teams pricing preserves the base-fee plus seat math
  Given the Devin Teams tier
  When the visitor views the pricing copy
  Then it states the team plan is billed as an $80/mo base fee plus $40/mo per full dev seat
  And it clarifies that the $120/mo shown is the real cost of the base plus one seat
  And the pricing disclosure paragraph spells out this base-fee plus seat math in visible copy

Scenario: Editor-assistant and code-review tiers are optional and unchecked by default
  Given the subscriptions-to-compare list
  When the calculator loads with its default selection
  Then only the Codex and Claude Code Pro (monthly) tiers are checked
  And the GitHub Copilot, Cursor, xAI Grok, Zed, Google AI, Amazon Q Developer, Devin, Replit, Mistral, Bolt, Lovable, Augment Code, Qodo, CodeRabbit, Kiro, Supermaven, JetBrains AI, Tabnine, Warp, Factory, and Manus tiers are present but unchecked
  And checking one adds its monthly price to the comparison without changing the defaults on reload

Scenario: Google AI tiers describe their current Plus, Pro, and Ultra benefits
  Given the Google AI Plus, Pro, Google AI Ultra 5x, and Google AI Ultra 20x tiers
  When the visitor views their included-value text
  Then each is described as a broad Google AI subscription
  And the Plus tier highlights 2× usage access, access to 3.6 Flash, Google Flow Credits, and 400 GB of storage without the Jules or Google Antigravity benefits
  And the Pro tier highlights 4× usage access, varying access to Gemini 3.1 Pro / Deep Search, Jules, Google Antigravity, Google Flow Credits, and 5 TB of storage
  And the Google AI Ultra 5x and Google AI Ultra 20x tiers keep the current Google AI Ultra product wording while surfacing the 5× and 20× price points
  And all four are optional and unchecked in the default selection

Scenario: Amazon Q Developer tiers disclose their quota caveat
  Given the Amazon Q Developer Free and Pro tiers
  When the visitor views their included-value text
  Then each notes that agentic requests and Java code transformation (lines of code) are quota-limited
  And the Free tier is priced at $0/mo and the Pro tier at $19/mo per user
  And both point at the official AWS Q Developer pricing page
  And both are optional and unchecked in the default selection

Scenario: Replit tiers disclose their Agent-credit and tax caveats
  Given the Replit Starter, Core, and Pro tiers
  When the visitor views their included-value text
  Then the Starter tier is priced at $0/mo with free daily Replit Agent credits
  And the Core tier is priced at $25/mo (or $20/mo effective billed annually) and includes $25/mo of Replit Agent credits
  And the Pro tier is priced at $100/mo (or $95/mo effective billed annually) and includes $100/mo of Replit Agent credits
  And the paid tiers note that usage beyond the included credits is billed separately and that taxes may vary by location
  And all point at the official Replit pricing page
  And all are optional and unchecked in the default selection

Scenario: Mistral tiers disclose their Vibe coding access and tax / fair-usage caveats
  Given the Mistral Free, Pro, Team, and Education tiers
  When the visitor views their included-value text
  Then the Free tier is priced at $0/mo with limited access to Vibe coding sessions
  And the Pro tier is priced at $14.99/mo excluding taxes with full access to Vibe for long-running tasks plus all-day coding
  And the Team tier is priced at $24.99/user/mo excluding taxes for a shared team workspace
  And the Education tier is priced at $5.99/mo excluding taxes for students
  And the paid tiers note that the price excludes taxes and that use is subject to fair-usage limits
  And all point at the official Mistral pricing page
  And all are optional and unchecked in the default selection

Scenario: Bolt tiers disclose their app-building token limits
  Given the Bolt Free, Pro, and Teams tiers
  When the visitor views their included-value text
  Then each is described as an app-building plan
  And the Free tier is priced at $0/mo capped at 300K tokens daily and 1M tokens monthly
  And the Pro tier is priced at $25/mo starting at 10M tokens per month with no daily token limit plus custom domain, SEO, and no-branding features
  And the Teams tier is priced at $30/member/mo with a shared team workspace and a per-member monthly token allotment
  And the copy notes that Bolt's Enterprise plan is custom-priced and out of scope
  And all point at the official Bolt pricing page
  And all are optional and unchecked in the default selection

Scenario: Lovable tiers disclose their credit-limit caveats
  Given the Lovable Free, Pro, and Business tiers
  When the visitor views their included-value text
  Then each is described as an app-building plan
  And the Free tier is priced at $0/mo with a limited allowance of free monthly credits
  And the Pro tier is priced at $25/mo with 100 monthly credits, credit rollovers, on-demand top-ups, custom domains, and no Lovable badge
  And the Business tier is priced at $50/mo with 100 monthly credits plus a team workspace, role-based access, internal publishing, and an SSO/security center
  And the copy notes that building beyond the included credits requires paid top-ups
  And the copy notes that Lovable's Enterprise plan is custom/volume-priced and out of scope
  And all point at the official Lovable pricing page
  And all are optional and unchecked in the default selection

Scenario: v0 tiers disclose their credits, daily-login, and training-opt-out caveats
  Given the v0 Free, Plus, and Business tiers
  When the visitor views their included-value text
  Then each is described as an app-building and UI-generation plan
  And the Free tier is priced at $0/mo with $5 of monthly credits and a 7-message/day cap
  And the Plus tier is priced at $30/user/mo with $30 of monthly credits per user and $2 of free daily login credits per user
  And the Business tier is priced at $100/user/mo with the same $30 credit base per user and training opt-out by default
  And the copy notes that additional credit purchases and centralized billing are available
  And all point at the official v0 pricing page
  And all are optional and unchecked in the default selection

Scenario: The Augment Code Business tier discloses its pooled-usage caveat
  Given the Augment Code Business tier
  When the visitor views its billing cadence and included-value text
  Then it is described as a team plan for the Augment Code coding agent
  And it is priced at a flat $100/mo covering up to 50 seats and $100/mo of pooled usage
  And it notes that usage beyond the pooled usage is billed as metered top-ups
  And it notes that Augment Code's Enterprise plan is custom-priced and out of scope
  And it points at the official Augment Code pricing page
  And it is optional and unchecked in the default selection

Scenario: The Qodo Pro Team tiers disclose their credit-metered caveat
  Given the Qodo Pro Team tiers
  When the visitor views their billing cadence and included-value text
  Then the Pro Team 2,500-credit pack is priced at $30/mo with 2,500 pooled credits at $0.012/credit
  And the Pro Team 5,000-credit pack is priced at $60/mo with 5,000 pooled credits at the same rate
  And the Pro Team 20,000-credit pack is priced at $240/mo with 20,000 pooled credits at the same rate
  And the copy notes that credits expire each monthly cycle, there is no annual commitment, no rate limits, and overage continues at the same per-credit rate subject to a spending cap
  And all point at the official Qodo pricing page
  And all are optional and unchecked in the default selection

Scenario: The CodeRabbit Pro tiers disclose their annual billing and out-of-scope Security plan
  Given the CodeRabbit Pro (annual) and Pro Plus (annual) tiers
  When the visitor views their billing cadence and included-value text
  Then the Pro plan is priced at $24/mo/user with annual billing and agentic AI reviews on PRs and CLI
  And the Pro Plus plan is priced at $48/mo/user with annual billing and higher limits, multi-repo analysis, issue planner, post-merge actions, tests, merge-conflict handling, and simplification finishing touches
  And the copy notes that CodeRabbit Security and usage-based add-ons are out of scope
  And both point at the official CodeRabbit pricing page
  And both are optional and unchecked in the default selection

Scenario: Amp tiers disclose their included-agent-usage caveat
  Given the Amp Megawatt and Gigawatt tiers
  When the visitor views their billing cadence and included-value text
  Then the Megawatt tier is priced at $20/mo with $20 of included agent usage
  And the Gigawatt tier is priced at $200/mo with $200 of included agent usage
  And each notes that usage beyond the included amount is billed pay-as-you-go
  And each notes that Amp's usage-based and Enterprise/BYOK options are out of scope
  And both point at the official Amp pricing page
  And both are optional and unchecked in the default selection

Scenario: TRAE tiers disclose their monthly-billed view and Pro trial caveat
  Given the TRAE Lite, Pro, Pro+, and Ultra tiers
  When the visitor views their billing cadence and included-value text
  Then the prices shown are stated to be the monthly-billed view
  And the Pro tier notes it is offered after a 7-day trial on the pricing page
  And the copy notes that monthly basic usage, bonus usage, queue priority, autocomplete, and concurrent cloud tasks scale up with the tier
  And all point at the official TRAE pricing page
  And all are optional and unchecked in the default selection

Scenario: Warp tiers disclose their agentic-terminal pricing ladder and credit caveats
  Given the Warp Free, Build, Max, and Business tiers
  When the visitor views their billing cadence and included-value text
  Then the Free tier is priced at $0/mo with core terminal features but no included AI usage
  And the Build tier starts at $20/mo with $20 (1,500 credits) of monthly AI usage plus frontier and open-source model access, 20 concurrent cloud agents, and 2 vCPU / 4 GiB cloud-agent compute
  And the Max tier starts at $200/mo with $240 (18,000 credits) of monthly AI usage plus 20 concurrent cloud agents and 4 vCPU / 8 GiB cloud-agent compute
  And the Business tier starts at $50/user/mo with $20 (1,500 credits) of monthly AI usage, up to 25 seats, 80 concurrent cloud agents, and 8 vCPU / 16 GiB cloud-agent compute
  And the copy notes that AI usage beyond the included monthly credits is billed separately
  And the copy notes that Warp's Enterprise plan is custom-priced and out of scope
  And all point at the official Warp pricing page
  And all are optional and unchecked in the default selection

Scenario: Factory tiers disclose their Droid-agent pricing ladder and out-of-scope plans
  Given the Factory Pro, Plus, and Max tiers
  When the visitor views their billing cadence and included-value text
  Then each is described as a monthly individual plan for Factory's Droid software-development agents
  And the Pro tier is priced at $20/mo with Desktop/CLI/SDK access plus cloud and local background agents
  And the Plus tier is priced at $100/mo with roughly 5× the Pro usage plus Droid Computers for remote Droids
  And the Max tier is priced at $200/mo with roughly 10× the Pro usage plus early access to new features
  And the copy notes that Factory's custom-priced Business and Enterprise plans are out of scope
  And all point at the official Factory pricing page
  And all are optional and unchecked in the default selection

Scenario: Manus tiers disclose their autonomous-agent pricing ladder and credit caveats
  Given the Manus Standard, Customizable, and Extended tiers
  When the visitor views their billing cadence and included-value text
  Then each is described as a monthly individual plan for the Manus autonomous general AI agent
  And the Standard tier is priced at $20/mo with a base monthly credit allowance for agentic tasks
  And the Customizable tier is priced at $40/mo with a larger credit allowance plus more concurrent tasks and customization options
  And the Extended tier is priced at $200/mo with the highest credit allowance and concurrent-task limits of the individual tiers
  And the copy notes that usage beyond the included credits requires add-on credits and that Manus's higher-tier team/enterprise plans are out of scope
  And the Manus tiers are categorized as App builder in the subscription filter
  And all point at the official Manus pricing page
  And all are optional and unchecked in the default selection

Scenario: Cline is disclosed as intentionally excluded from the priced tiers
  Given the pricing disclosure copy
  When the visitor reads it
  Then it states that Cline is intentionally left out of the priced comparison
  And it explains that Cline is a free, open-source, bring-your-own-key (BYOK) VS Code / JetBrains coding agent with no fixed subscription price
  And it notes that Cline's optional Cline-hosted API credits are pure usage-based spend and are out of scope
  And the exclusion is disclosed as a deliberate choice rather than an oversight
  And no priced subscription row is added for Cline

Scenario: Usage-based tiers disclose their included-credit caveat
  Given a usage-based tier such as GitHub Copilot Pro or Zed Pro
  When the visitor views its included-value text
  Then the included monthly credits are stated (GitHub AI Credits or Zed token credits)
  And it is noted that usage beyond the included credits is billed separately

Scenario: Billing cadence and included value are shown
  Given a subscription tier in the comparison or pricing section
  When the visitor views it
  Then the monthly comparison price is shown as the headline number
  And the tier's billing cadence is shown (monthly, annual up front, or per seat)
  And a short description of what the tier includes is shown

Scenario: Annually billed tiers compare at their effective monthly price
  Given an annually billed tier such as Claude Code Pro annual
  When the calculator compares subscription spend
  Then the tier contributes its effective monthly price (annual price ÷ 12) to the comparison
  And the annual billing cadence is disclosed as context but does not change the math

Scenario: Pricing section shows pricing freshness
  Given the pricing section
  When the visitor views it
  Then a "Pricing last updated" timestamp reflecting when the pricing data was last curated is shown
  And it is rendered as a <time> element whose datetime attribute holds the machine-readable ISO date
  And this pricing-freshness date is distinct from the site-wide last-updated disclosure shown in the footer

Scenario: Hardware prices and sources are disclosed
  Given the hardware comparison section
  When the visitor views it
  Then each featured hardware option shows a visible price or price range
  And the source of the hardware price is listed
  And the source status shows whether the number is official, retailer, or estimate
  And the source status includes the last verified date

Scenario: Mac Studio pricing surfaces an official financing example
  Given the hardware comparison section
  When the visitor views the Mac Studio card
  Then it includes Apple's official example financing copy beneath the price note
  And the example mentions the $208.25/mo for 12 months purchase example and the 36-month Apple Upgrade lease example
  And the example links to the Apple buy/configure page

Scenario: Mac Studio pricing uses the current Apple preorder lineup
  Given the hardware comparison section
  When the visitor views the Mac Studio card
  Then the displayed price range comes from Apple's current buy/configuration page
  And the range spans the current $2,499-$6,799 preorder lineup for M5 Max and M5 Ultra systems
  And the source link points to the direct buy page for Mac Studio
  And the card offers a trim selector for alternative configurations
  And the featured preload uses the low end of the configurable range

Scenario: Strix Halo pricing uses a current official AMD product page
  Given the hardware comparison section
  When the visitor views the AMD Strix Halo card
  Then the source link points to a current official AMD Ryzen AI Max+ product page
  And the source link does not point to the retired AMD URL that returns 404
  And the featured guide mirrors the same source link in its price snapshot
  And the Strix Halo examples section includes a Framework Desktop option alongside the GMKtec and MINISFORUM systems
  And the Framework Desktop source link points to the canonical live Framework configuration page rather than the redirecting landing URL
  And the Framework Desktop CTA points to the official Framework destination without a sponsored affiliate label

Scenario: Affiliate links are separate from price sources
  Given a featured hardware option with a reseller or affiliate CTA
  When the visitor views the comparison row or pricing list
  Then the source link points to the pricing source
  And the affiliate CTA points to a separate destination
  And changing affiliate metadata does not change the displayed price or source URL

Scenario: DGX Spark uses NVIDIA's official Marketplace Buy Now path
  Given the DGX Spark featured hardware card
  When the visitor views its call to action
  Then the CTA links to NVIDIA's official Marketplace Buy Now page for DGX Spark
  And the CTA uses NVIDIA's current canonical enterprise/personal-ai-supercomputers path directly
  And the CTA is a direct official purchase path, not a commissioned affiliate link
  And it carries no "(affiliate)" label and no sponsored rel marker
  And the displayed price still comes from the unchanged retailer pricing source
  And the other featured hardware cards may still use affiliate or reseller CTAs

Scenario: DGX Spark surfaces current retailer trims alongside the base range
  Given the DGX Spark featured hardware card
  When the visitor views its price note and trim selector
  Then the base range spans a $3,971-$6,030 estimate for the platform class
  And the trim selector includes the Seeed Studio $3,999 listing
  And the trim selector includes the ASUS Ascent GX10 GB10 system
  And the trim selector includes the PNY 4 TB retailer listing at $5,199.99
  And the trim selector includes the HP ZGX Nano G1n 2 TB and 4 TB retailer listings
  And the trim selector includes the Acer Veriton VGN100-UD11 retailer listing at $5,199.00
  And the trim selector includes the GIGABYTE AI TOP ATOM retailer price band around $4,999.99-$5,999.99
  And the trim selector includes the MSI EdgeXpert retailer price band around $5,339.99-$6,136.99
  And the named trims stay separate from the official Marketplace CTA

Scenario: Featured products are named clearly
  Given the hardware comparison section
  When the visitor views it
  Then the product names include Mac Studio, DGX Spark, ASUS Ascent GX10, and Strix Halo class systems
  And each product name is paired with a source or vendor label

Scenario: High-end reference workstation classes are listed without becoming featured cards
  Given the hardware comparison and pricing sections
  When the visitor looks for an RTX PRO 6000 Blackwell workstation class
  Then the pricing data includes the RTX PRO 6000 Blackwell workstation as a retailer-derived reference class
  And it shows the 96 GB GDDR7 ECC VRAM spec with a build-required workstation caveat
  And the reference class does not appear among the featured hardware cards

Scenario: Prices are described as estimates
  Given the pricing section
  When the visitor reads the disclosure
  Then it states prices are periodically curated and may be out of date

Scenario: Price source links open externally
  Given a source link in the pricing section
  When the visitor clicks it
  Then the link opens the referenced source
  And the calculator state remains unchanged

```

> Maintenance tooling: the health check lives in `scripts/health-check.mjs`,
> runs offline-testably (fetch and clock are injectable), and is specified in
> `docs/bdd/health-check.md`. It is run on demand by a maintainer
> (`npm run health-check`) and on a schedule via the
> `.github/workflows/health-check.yml` workflow; it is deliberately kept off the
> deploy path so vendor bot-protection or transient network errors never block a
> push to `main`.
