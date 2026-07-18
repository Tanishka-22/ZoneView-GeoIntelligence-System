import {
  PrismaClient,
  PlanType,
  RecordStatus,
  InsightType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================
  // 1. PLANS
  // ============================================================
  console.log('📋 Seeding plans...');

  const freePlan = await prisma.plan.upsert({
    where: { type: PlanType.FREE },
    update: {},
    create: {
      name: 'Free',
      type: PlanType.FREE,
      description: 'Basic regional exploration with limited AI capabilities.',
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { type: PlanType.PRO },
    update: {},
    create: {
      name: 'Pro',
      type: PlanType.PRO,
      description:
        'Advanced AI insights, report generation, and historical analytics.',
    },
  });

  const teamPlan = await prisma.plan.upsert({
    where: { type: PlanType.TEAM },
    update: {},
    create: {
      name: 'Team',
      type: PlanType.TEAM,
      description:
        'Collaborative workspaces, shared resources, and team analytics.',
    },
  });

  console.log(`   ✓ Free plan   (id: ${freePlan.id})`);
  console.log(`   ✓ Pro plan    (id: ${proPlan.id})`);
  console.log(`   ✓ Team plan   (id: ${teamPlan.id})\n`);

  // ============================================================
  // 2. CATEGORIES
  // ============================================================
  console.log('🏷️  Seeding categories...');

  await prisma.category.createMany({
    data: [
      {
        name: 'Transportation',
        slug: 'transportation',
        description: 'Roads, bridges, metro, railways, and airports.',
      },
      {
        name: 'Healthcare',
        slug: 'healthcare',
        description: 'Hospitals, clinics, and public health infrastructure.',
      },
      {
        name: 'Education',
        slug: 'education',
        description: 'Schools, colleges, universities, and skill centers.',
      },
      {
        name: 'Environment',
        slug: 'environment',
        description:
          'Parks, green spaces, water bodies, and pollution control.',
      },
      {
        name: 'Utilities',
        slug: 'utilities',
        description: 'Water supply, electricity, sewage, and waste management.',
      },
      {
        name: 'Government Initiative',
        slug: 'government-initiative',
        description:
          'Smart city missions, central schemes, and state programs.',
      },
      {
        name: 'Commercial',
        slug: 'commercial',
        description: 'Industrial zones, SEZs, markets, and business parks.',
      },
      {
        name: 'Housing',
        slug: 'housing',
        description: 'Residential projects, affordable housing, and townships.',
      },
    ],
    skipDuplicates: true,
  });

  const categories = await prisma.category.findMany();
  categories.forEach((c) => console.log(`   ✓ ${c.name}`));
  console.log();

  // ============================================================
  // 3. ORGANIZATIONS
  // ============================================================
  console.log('🏛️  Seeding organizations...');

  await prisma.organization.createMany({
    data: [
      {
        name: 'Jabalpur Municipal Corporation',
        description:
          'Urban local body responsible for civic amenities in Jabalpur.',
        website: 'https://www.jmc.org.in',
      },
      {
        name: 'Public Works Department Madhya Pradesh',
        description:
          'State agency managing roads, bridges, and public buildings.',
        website: 'https://www.mppwd.nic.in',
      },
      {
        name: 'Smart Cities Mission',
        description: 'Central government initiative for urban transformation.',
        website: 'https://smartcities.gov.in',
      },
      {
        name: 'National Highway Authority of India',
        description: 'Agency responsible for development of national highways.',
        website: 'https://www.nhai.gov.in',
      },
      {
        name: 'Madhya Pradesh Urban Development Authority',
        description: 'State authority for urban planning and development.',
      },
      {
        name: 'Ministry of Health and Family Welfare',
        description: 'Central ministry overseeing national health programs.',
        website: 'https://mohfw.gov.in',
      },
    ],
    skipDuplicates: true,
  });

  const organizations = await prisma.organization.findMany();
  organizations.forEach((o) => console.log(`   ✓ ${o.name}`));
  console.log();

  // ============================================================
  // 4. DATA SOURCES
  // ============================================================
  console.log('📡 Seeding data sources...');

  await prisma.dataSource.createMany({
    data: [
      {
        name: 'Smart Cities Mission Portal',
        url: 'https://smartcities.gov.in',
        description: 'Official portal for Smart City project data.',
      },
      {
        name: 'MP Government Open Data',
        url: 'https://mpdata.gov.in',
        description: 'Madhya Pradesh open government dataset portal.',
      },
      {
        name: 'Manual Entry',
        description: 'Data entered manually by platform administrators.',
      },
    ],
    skipDuplicates: true,
  });

  const dataSources = await prisma.dataSource.findMany();
  dataSources.forEach((d) => console.log(`   ✓ ${d.name}`));
  console.log();

  // Lookups needed early — used by both pan-India seeding (5b) and main records (6)
const manualSource = dataSources.find((d) => d.name === 'Manual Entry')!;
const smartCitiesSource = dataSources.find((d) => d.name === 'Smart Cities Mission Portal')!;

  // ============================================================
  // 5. LOCATIONS
  // ============================================================
  console.log('📍 Seeding locations...');

  const jabalpur = await prisma.location.upsert({
    where: { slug: 'jabalpur' },
    update: {},
    create: {
      name: 'Jabalpur',
      slug: 'jabalpur',
      description:
        'A major city in Madhya Pradesh, known as the Cultural Capital of MP. ' +
        'One of the fastest-developing tier-2 cities under the Smart City Mission.',
      country: 'India',
      state: 'Madhya Pradesh',
      district: 'Jabalpur',
      city: 'Jabalpur',
      latitude: 23.1815,
      longitude: 79.9864,
    },
  });

  const bhopal = await prisma.location.upsert({
    where: { slug: 'bhopal' },
    update: {},
    create: {
      name: 'Bhopal',
      slug: 'bhopal',
      description:
        'The capital city of Madhya Pradesh and one of the greenest cities in India.',
      country: 'India',
      state: 'Madhya Pradesh',
      district: 'Bhopal',
      city: 'Bhopal',
      latitude: 23.2599,
      longitude: 77.4126,
    },
  });

  const indore = await prisma.location.upsert({
    where: { slug: 'indore' },
    update: {},
    create: {
      name: 'Indore',
      slug: 'indore',
      description:
        "The commercial capital of Madhya Pradesh and India's cleanest city for multiple consecutive years.",
      country: 'India',
      state: 'Madhya Pradesh',
      district: 'Indore',
      city: 'Indore',
      latitude: 22.7196,
      longitude: 75.8577,
    },
  });

  console.log(`   ✓ Jabalpur  (id: ${jabalpur.id})`);
  console.log(`   ✓ Bhopal    (id: ${bhopal.id})`);
  console.log(`   ✓ Indore    (id: ${indore.id})\n`);

  // ============================================================
  // 5b. PAN-INDIA LOCATIONS (expanding beyond Madhya Pradesh)
  // ============================================================
  console.log('🇮🇳 Seeding pan-India locations...');

  const indiaCities = [
    {
      name: 'Delhi',
      slug: 'delhi',
      state: 'Delhi',
      lat: 28.7041,
      lng: 77.1025,
    },
    {
      name: 'Mumbai',
      slug: 'mumbai',
      state: 'Maharashtra',
      lat: 19.076,
      lng: 72.8777,
    },
    {
      name: 'Bengaluru',
      slug: 'bengaluru',
      state: 'Karnataka',
      lat: 12.9716,
      lng: 77.5946,
    },
    {
      name: 'Chennai',
      slug: 'chennai',
      state: 'Tamil Nadu',
      lat: 13.0827,
      lng: 80.2707,
    },
    {
      name: 'Kolkata',
      slug: 'kolkata',
      state: 'West Bengal',
      lat: 22.5726,
      lng: 88.3639,
    },
    {
      name: 'Hyderabad',
      slug: 'hyderabad',
      state: 'Telangana',
      lat: 17.385,
      lng: 78.4867,
    },
    {
      name: 'Pune',
      slug: 'pune',
      state: 'Maharashtra',
      lat: 18.5204,
      lng: 73.8567,
    },
    {
      name: 'Ahmedabad',
      slug: 'ahmedabad',
      state: 'Gujarat',
      lat: 23.0225,
      lng: 72.5714,
    },
    {
      name: 'Jaipur',
      slug: 'jaipur',
      state: 'Rajasthan',
      lat: 26.9124,
      lng: 75.7873,
    },
    {
      name: 'Lucknow',
      slug: 'lucknow',
      state: 'Uttar Pradesh',
      lat: 26.8467,
      lng: 80.9462,
    },
    {
      name: 'Chandigarh',
      slug: 'chandigarh',
      state: 'Chandigarh',
      lat: 30.7333,
      lng: 76.7794,
    },
    {
      name: 'Patna',
      slug: 'patna',
      state: 'Bihar',
      lat: 25.5941,
      lng: 85.1376,
    },
    {
      name: 'Bhubaneswar',
      slug: 'bhubaneswar',
      state: 'Odisha',
      lat: 20.2961,
      lng: 85.8245,
    },
    {
      name: 'Guwahati',
      slug: 'guwahati',
      state: 'Assam',
      lat: 26.1445,
      lng: 91.7362,
    },
    {
      name: 'Kochi',
      slug: 'kochi',
      state: 'Kerala',
      lat: 9.9312,
      lng: 76.2673,
    },
    {
      name: 'Surat',
      slug: 'surat',
      state: 'Gujarat',
      lat: 21.1702,
      lng: 72.8311,
    },
    {
      name: 'Nagpur',
      slug: 'nagpur',
      state: 'Maharashtra',
      lat: 21.1458,
      lng: 79.0882,
    },
    {
      name: 'Coimbatore',
      slug: 'coimbatore',
      state: 'Tamil Nadu',
      lat: 11.0168,
      lng: 76.9558,
    },
    {
      name: 'Visakhapatnam',
      slug: 'visakhapatnam',
      state: 'Andhra Pradesh',
      lat: 17.6868,
      lng: 83.2185,
    },
    {
      name: 'Dehradun',
      slug: 'dehradun',
      state: 'Uttarakhand',
      lat: 30.3165,
      lng: 78.0322,
    },
  ];

  const createdCities: Array<
    Awaited<ReturnType<typeof prisma.location.upsert>>
  > = [];
  for (const city of indiaCities) {
    const created = await prisma.location.upsert({
      where: { slug: city.slug },
      update: {},
      create: {
        name: city.name,
        slug: city.slug,
        description: `${city.name} is a major urban center in ${city.state}, tracked by ZoneView for regional development intelligence.`,
        country: 'India',
        state: city.state,
        city: city.name,
        latitude: city.lat,
        longitude: city.lng,
      },
    });
    createdCities.push(created);
    console.log(`   ✓ ${city.name}, ${city.state}`);
  }

  // Light sample development records so the map/detail pages aren't empty
  const govInitCategory = categories.find(
    (c) => c.slug === 'government-initiative',
  )!;
  const scmOrg = organizations.find((o) => o.name === 'Smart Cities Mission')!;

  await prisma.developmentRecord.createMany({
    data: createdCities.map((city) => ({
      title: `${city.name} Smart City Digital Infrastructure Initiative`,
      description: `Digital governance and urban infrastructure upgrade program for ${city.name} under the Smart Cities Mission.`,
      status: RecordStatus.ONGOING,
      budget: 150000000 + Math.random() * 200000000,
      locationId: city.id,
      categoryId: govInitCategory.id,
      organizationId: scmOrg.id,
      dataSourceId: manualSource.id,
    })),
    skipDuplicates: true,
  });

  console.log(
    `   ✓ ${createdCities.length} sample development records added\n`,
  );

  // ============================================================
  // 6. DEVELOPMENT RECORDS
  // ============================================================
  console.log('🏗️  Seeding development records...');

  const transportCategory = categories.find(
    (c) => c.slug === 'transportation',
  )!;
  const healthCategory = categories.find((c) => c.slug === 'healthcare')!;
  const govCategory = categories.find(
    (c) => c.slug === 'government-initiative',
  )!;
  const envCategory = categories.find((c) => c.slug === 'environment')!;

  const jmc = organizations.find(
    (o) => o.name === 'Jabalpur Municipal Corporation',
  )!;
  const pwd = organizations.find(
    (o) => o.name === 'Public Works Department Madhya Pradesh',
  )!;
  const scm = organizations.find((o) => o.name === 'Smart Cities Mission')!;

  //const smartCitiesSource = dataSources.find((d) => d.name === 'Smart Cities Mission Portal',)!;
  //const manualSource = dataSources.find((d) => d.name === 'Manual Entry')!;

  await prisma.developmentRecord.createMany({
    data: [
      // Jabalpur records
      {
        title: 'Jabalpur Smart Road Development Phase 1',
        description:
          'Development of 45 km of smart roads with integrated street lighting, ' +
          'drainage systems, and pedestrian pathways across major corridors in Jabalpur.',
        status: RecordStatus.ONGOING,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2025-12-31'),
        budget: 285000000,
        locationId: jabalpur.id,
        categoryId: transportCategory.id,
        organizationId: pwd.id,
        dataSourceId: smartCitiesSource.id,
      },
      {
        title: 'Jabalpur Integrated Command and Control Centre',
        description:
          'Establishment of a city-wide command and control centre for real-time ' +
          'monitoring of traffic, utilities, and emergency services under Smart City Mission.',
        status: RecordStatus.COMPLETED,
        startDate: new Date('2022-01-01'),
        endDate: new Date('2024-03-31'),
        budget: 150000000,
        locationId: jabalpur.id,
        categoryId: govCategory.id,
        organizationId: scm.id,
        dataSourceId: smartCitiesSource.id,
      },
      {
        title: 'Rani Durgavati Medical College Expansion',
        description:
          'Expansion of the government medical college with a new 500-bed hospital wing, ' +
          'modern diagnostic centre, and specialized trauma care unit.',
        status: RecordStatus.ONGOING,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-06-30'),
        budget: 420000000,
        locationId: jabalpur.id,
        categoryId: healthCategory.id,
        organizationId: jmc.id,
        dataSourceId: manualSource.id,
      },
      {
        title: 'Bhedaghat Narmada Riverfront Development',
        description:
          'Development of the Narmada riverfront near Bhedaghat with eco-tourism ' +
          'facilities, walking trails, and cultural spaces while preserving the natural environment.',
        status: RecordStatus.PLANNED,
        startDate: new Date('2025-04-01'),
        budget: 95000000,
        locationId: jabalpur.id,
        categoryId: envCategory.id,
        organizationId: jmc.id,
        dataSourceId: manualSource.id,
      },
      // Bhopal records
      {
        title: 'Bhopal Metro Rail Phase 2',
        description:
          'Extension of the Bhopal Metro Rail network with 12 new stations ' +
          'connecting AIIMS Bhopal to the Old City area.',
        status: RecordStatus.ONGOING,
        startDate: new Date('2023-09-01'),
        endDate: new Date('2027-03-31'),
        budget: 3200000000,
        locationId: bhopal.id,
        categoryId: transportCategory.id,
        organizationId: pwd.id,
        dataSourceId: manualSource.id,
      },
      // Indore records
      {
        title: 'Indore BRT Corridor Expansion',
        description:
          'Expansion of the Bus Rapid Transit corridor to cover 38 additional ' +
          'kilometres connecting industrial zones to the city centre.',
        status: RecordStatus.COMPLETED,
        startDate: new Date('2021-01-01'),
        endDate: new Date('2023-08-31'),
        budget: 180000000,
        locationId: indore.id,
        categoryId: transportCategory.id,
        organizationId: scm.id,
        dataSourceId: smartCitiesSource.id,
      },
    ],
    skipDuplicates: true,
  });

  const recordCount = await prisma.developmentRecord.count();
  console.log(`   ✓ ${recordCount} development records created\n`);

  // ============================================================
  // 7. SAMPLE AI INSIGHT
  // ============================================================
  console.log('🤖 Seeding sample AI insight...');

  await prisma.aIInsight.upsert({
    where: { id: 'seed-insight-jabalpur-001' },
    update: {},
    create: {
      id: 'seed-insight-jabalpur-001',
      type: InsightType.REGIONAL_SUMMARY,
      content:
        'Jabalpur is experiencing significant infrastructure-led growth as part of the ' +
        'Smart City Mission. The city has made substantial progress in road development, ' +
        'digital infrastructure, and healthcare expansion. The ongoing Smart Road Development ' +
        'Phase 1 is transforming major corridors, while the completed Command and Control ' +
        "Centre positions Jabalpur as one of MP's most technologically integrated cities. " +
        'The planned Narmada Riverfront Development signals a growing emphasis on ' +
        'sustainable, eco-sensitive urban planning.',
      model: 'seed-data',
      locationId: jabalpur.id,
    },
  });

  console.log('   ✓ Sample AI insight for Jabalpur\n');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('✅ Seed complete!\n');
  console.log('📊 Database summary:');
  console.log(`   Plans:               ${await prisma.plan.count()}`);
  console.log(`   Categories:          ${await prisma.category.count()}`);
  console.log(`   Organizations:       ${await prisma.organization.count()}`);
  console.log(`   Data Sources:        ${await prisma.dataSource.count()}`);
  console.log(`   Locations:           ${await prisma.location.count()}`);
  console.log(
    `   Development Records: ${await prisma.developmentRecord.count()}`,
  );
  console.log(`   AI Insights:         ${await prisma.aIInsight.count()}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
