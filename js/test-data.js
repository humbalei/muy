// TEST DATA - Run this in browser console to add test knowledge
// Then test the AI chat, then run clearTestData() to delete

async function addTestData() {
  console.log('Adding test data...');

  const testEntries = [
    {
      type: 'text',
      keywords: 'pricing ceny platby models modely kolik',
      content: `PRICING INFO:
- New model setup fee: $100 one-time
- Monthly management fee: 20% of earnings
- Minimum payout: $50
- Payment schedule: Every Monday
- Payment methods: Crypto (USDT, BTC), PayPal, Wise`,
      examples: `Q: How much does it cost to work with you?
A: Our pricing is simple - there's a one-time $100 setup fee to get everything started, and then we take 20% of your monthly earnings. Minimum payout is $50 and we pay every Monday via crypto, PayPal or Wise.

Q: Kolik to stojí?
A: Setup fee je $100 jednorázově, pak bereme 20% z výdělků. Minimální výplata je $50, platíme každé pondělí.`,
      createdAt: new Date()
    },
    {
      type: 'text',
      keywords: 'onboarding new model novy model postup zacatek',
      content: `NEW MODEL ONBOARDING PROCESS:
1. Get their social media links (IG, Twitter)
2. Verify age (must be 18+) - need ID
3. Sign contract (use DocuSign template)
4. Setup accounts on platforms (OnlyFans, Fansly)
5. Create content calendar
6. First photoshoot within 7 days
7. Launch promotion after 2 weeks of content`,
      examples: `Q: What are the steps to onboard a new model?
A: Here's our onboarding process: First get their social links and verify they're 18+ with ID. Then send the contract via DocuSign. Once signed, set up their OF and Fansly accounts, create a content calendar, schedule their first photoshoot within 7 days, and launch promotions after 2 weeks of content is ready.

Q: Jak přidám novou modelku?
A: Nejdřív si vezmi její sociální sítě a ověř věk (18+ s občankou). Pošli smlouvu přes DocuSign, pak založ účty na OF a Fansly. Vytvoř content kalendář, naplánuj první focení do 7 dnů a po 2 týdnech contentu spusť promo.`,
      createdAt: new Date()
    },
    {
      type: 'text',
      keywords: 'outreach dm instagram twitter pravidla rules',
      content: `OUTREACH RULES:
- Max 50 DMs per day per account
- Use warm-up for 3 days before outreach
- Never mention money in first message
- Opener must be personalized (comment on their content)
- Follow-up after 48 hours if no response
- Stop after 3 follow-ups
- Track everything in spreadsheet`,
      examples: `Q: What are the outreach rules?
A: Key rules: Maximum 50 DMs per day per account. Always warm up new accounts for 3 days first. Never mention money in your first message - keep it personal and comment on their content. If no reply, follow up after 48 hours. Stop after 3 follow-ups max. And track everything in the spreadsheet!

Q: Kolik DMs můžu posílat?
A: Maximum 50 DMs denně na účet. Nové účty nejdřív 3 dny zahřívej. V první zprávě nezmiňuj peníze, piš personalizovaně. Follow-up po 48h, max 3x. Všechno trackuj v sheetu.`,
      createdAt: new Date()
    },
    {
      type: 'file',
      keywords: 'scripts opener followup message templates skripty zpravy',
      title: 'DM Scripts',
      content: `OPENER SCRIPTS:

Instagram Opener 1:
"Hey! Love your aesthetic 😍 Your photos are giving major model vibes. Have you ever thought about doing content creation professionally?"

Instagram Opener 2:
"Hi babe! Just came across your page and wow 🔥 You have such a unique look. Quick question for you..."

FOLLOW-UP:
"Hey! Just checking if you saw my last message? Would love to chat if you're interested 💕"`,
      examples: `Q: Give me an opener script for Instagram
A: Here's a good one: "Hey! Love your aesthetic 😍 Your photos are giving major model vibes. Have you ever thought about doing content creation professionally?" - Keep it friendly and compliment something specific about their content.

Q: Dej mi follow-up message
A: Použij tohle: "Hey! Just checking if you saw my last message? Would love to chat if you're interested 💕" - Pošli to 48 hodin po prvním DM.`,
      createdAt: new Date()
    },
    {
      type: 'text',
      keywords: 'emergency problem issue ban banned account problem',
      content: `EMERGENCY PROCEDURES:
- Account banned: Contact platform support immediately, document everything
- Chargebacks: Screenshot all conversations, report to platform
- Leaked content: DMCA takedown immediately, use BrandItScan
- Model not responding: Wait 24h, then call, then emergency contact
- Payment issues: Check Wise/crypto status, contact within 2 hours`,
      examples: `Q: What do I do if an account gets banned?
A: Contact platform support IMMEDIATELY and document everything - screenshots of the account, any emails, everything. Time is critical with bans.

Q: Model leakla content, co teď?
A: Okamžitě DMCA takedown! Použij BrandItScan na vyhledání kde všude to je. Dokumentuj vše pro případné právní kroky.`,
      createdAt: new Date()
    }
  ];

  for (const entry of testEntries) {
    await DB.add('knowledge_base', entry);
    console.log('Added:', entry.keywords.substring(0, 30) + '...');
  }

  console.log('✅ Test data added! Now test the AI chat with questions like:');
  console.log('- "What is the pricing for models?"');
  console.log('- "How do I onboard a new model?"');
  console.log('- "What are the outreach rules?"');
  console.log('- "Give me an opener script for Instagram"');
  console.log('- "What should I do if an account gets banned?"');
}

async function clearTestData() {
  console.log('Clearing all knowledge base data...');
  const kb = await DB.getKnowledge();
  for (const entry of kb) {
    await DB.delete('knowledge_base', entry.id);
  }
  console.log('✅ All knowledge base data cleared!');
}

// Instructions
console.log('=== TEST DATA SCRIPT ===');
console.log('Run addTestData() to add test entries');
console.log('Run clearTestData() to delete all entries');
