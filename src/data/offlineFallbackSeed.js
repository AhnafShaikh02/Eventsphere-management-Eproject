function isoDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function createOfflineFallbackSnapshot() {
  const now = new Date().toISOString();
  const zones = [
    'North Innovation Wing',
    'Central Atrium',
    'West Robotics Row',
    'South Enterprise Hall',
  ];
  const reservedAssignments = {
    A2: { id: 'exh-1', name: 'Lumina Robotics' },
    A5: { id: 'exh-4', name: 'Prism Spatial Labs' },
    B3: { id: 'exh-2', name: 'AetherGrid CleanTech' },
    C1: { id: 'exh-3', name: 'Sentinel Mesh Security' },
    C4: { id: 'exh-5', name: 'HelixBio Diagnostics' },
    D2: { id: 'exh-1', name: 'Lumina Robotics' },
  };
  const pendingSet = new Set(['A4', 'B5', 'C6', 'D4']);

  const booths = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const code = `${'ABCD'[r]}${c + 1}`;
      const assigned = reservedAssignments[code];
      const status = assigned ? 'reserved' : pendingSet.has(code) ? 'pending' : 'available';
      const size =
        c === 0 || c === 5
          ? '6x3m Corner'
          : r === 1 && (c === 2 || c === 3)
            ? '6x6m Island'
            : '3x3m Standard';
      const priceUsd = size === '6x6m Island' ? 6800 : size === '6x3m Corner' ? 4200 : 2800;

      booths.push({
        id: `booth-${code}`,
        expoId: 'expo-2026-global',
        number: code,
        zone: zones[r],
        size,
        priceUsd,
        status,
        row: r,
        col: c,
        exhibitorId: assigned ? assigned.id : null,
        exhibitorName: assigned ? assigned.name : null,
        trafficCount: 35 + ((r * 17 + c * 23) % 140),
      });
    }
  }

  const analyticsSeries = [];
  for (let d = 29; d >= 0; d--) {
    analyticsSeries.push({
      date: isoDaysAgo(d),
      boothTraffic: 140 + ((d * 29) % 180) + (d < 5 ? 95 : 0),
      sessionBookmarks: 48 + ((d * 17) % 75) + (d < 5 ? 40 : 0),
      profileViews: 95 + ((d * 23) % 130) + (d < 5 ? 60 : 0),
    });
  }

  return {
    expos: [
      {
        id: 'expo-2026-global',
        title: 'NextGen Industrial & Tech Expo 2026',
        date: '2026-11-18',
        endDate: '2026-11-20',
        location: 'ExCeL Hall 4 · London',
        description:
          'Flagship three-day convergence of autonomous robotics, clean microgrids, spatial twins, and enterprise security.',
        theme: 'Autonomous Infrastructure & Live Twins',
        category: 'Robotics & AI',
        status: 'live',
        capacity: 1200,
        bannerAccent: '#D4AF63',
        registeredUserIds: ['usr-att-1'],
      },
      {
        id: 'expo-2026-bio',
        title: 'BioMed & Diagnostics Summit 2026',
        date: '2026-12-08',
        endDate: '2026-12-09',
        location: 'Moscone West · San Francisco',
        description:
          'Clinical instrumentation, microfluidic diagnostics, and hospital automation showcase.',
        theme: 'Precision Diagnostics at Scale',
        category: 'Biotech & MedTech',
        status: 'upcoming',
        capacity: 650,
        bannerAccent: '#2DD4BF',
        registeredUserIds: [],
      },
      {
        id: 'expo-2026-clean',
        title: 'CleanGrid Energy Forum 2026',
        date: '2027-01-22',
        endDate: '2027-01-24',
        location: 'Messe Berlin · Hall 2',
        description:
          'Commercial solid-state battery storage, bidirectional microgrids, and zero-emission venue architecture.',
        theme: 'Zero-Emission Venue Power',
        category: 'Clean Energy',
        status: 'upcoming',
        capacity: 900,
        bannerAccent: '#E8C987',
        registeredUserIds: [],
      },
    ],
    booths,
    exhibitors: [
      {
        id: 'exh-1',
        userId: 'usr-exh-1',
        companyName: 'Lumina Robotics',
        category: 'Robotics & AI',
        tagline: 'Autonomous warehouse orchestration and tactile manipulator arms',
        description:
          'Lumina builds millimeter-accurate cobots and fleet routing controllers engineered for high-throughput fulfillment centers.',
        logoColor: '#D4AF63',
        contactEmail: 'exhibitor@lumina-robotics.io',
        phone: '+44 20 7946 0811',
        website: 'https://lumina-robotics.example',
        products: ['Lumina Arm M4', 'FleetOS Edge Router', 'VisionPick Sensor Kit'],
        staff: ['Marcus Chen', 'Priya Nair', 'Liam Brooks'],
        documents: ['ISO-10218-Safety-Cert.pdf', 'Booth-Power-Spec.pdf'],
        profileViews: 248,
      },
      {
        id: 'exh-2',
        userId: 'usr-exh-2',
        companyName: 'AetherGrid CleanTech',
        category: 'Clean Energy',
        tagline: 'Modular solid-state microgrids for zero-emission venues',
        description:
          'High-density containerized battery storage and bidirectional DC microgrids powering commercial expos and campuses.',
        logoColor: '#E8C987',
        contactEmail: 'exhibitor@aethergrid.io',
        phone: '+44 20 7946 0420',
        website: 'https://aethergrid.example',
        products: ['AetherCell 500kWh', 'GridPulse Telemetry', 'SolarSync Inverter'],
        staff: ['Sora Takahashi', 'Devon Cole'],
        documents: ['UL-9540-Compliance.pdf'],
        profileViews: 194,
      },
      {
        id: 'exh-3',
        userId: 'usr-exh-3',
        companyName: 'Sentinel Mesh Security',
        category: 'Cloud & Security',
        tagline: 'Zero-trust identity fabric for distributed edge fleets',
        description:
          'Hardware-attested workload identities and real-time anomaly containment for industrial IoT deployments.',
        logoColor: '#F97362',
        contactEmail: 'hello@sentinelmesh.example',
        phone: '+1 415 555 0194',
        website: 'https://sentinelmesh.example',
        products: ['MeshGate HSM', 'ZeroTrust CLI', 'AuditStream'],
        staff: ['Aria Novak', 'Julian Cruz'],
        documents: ['SOC2-Attestation.pdf'],
        profileViews: 176,
      },
      {
        id: 'exh-4',
        userId: 'usr-exh-4',
        companyName: 'Prism Spatial Labs',
        category: 'Spatial Computing',
        tagline: 'Real-time digital twin optics and holographic CAD review',
        description:
          'Ultra-low-latency WebGL and headset visualization engines for architectural, factory, and live venue twins.',
        logoColor: '#38BDF8',
        contactEmail: 'team@prismspatial.example',
        phone: '+46 8 555 0142',
        website: 'https://prismspatial.example',
        products: ['Prism Twin Studio', 'HoloLink SDK'],
        staff: ['Noah Lindqvist', 'Chloe Park'],
        documents: ['Optics-Safety-Spec.pdf'],
        profileViews: 215,
      },
      {
        id: 'exh-5',
        userId: 'usr-exh-5',
        companyName: 'HelixBio Diagnostics',
        category: 'Biotech & MedTech',
        tagline: 'Point-of-care microfluidic sequencers under 12 minutes',
        description:
          'Portable isothermal assay cartridges and encrypted clinical telemetry dashboards.',
        logoColor: '#F59E0B',
        contactEmail: 'info@helixbio.example',
        phone: '+1 650 555 0118',
        website: 'https://helixbio.example',
        products: ['HelixCartridge Pro', 'BioVault Sync'],
        staff: ['Dr. Amara Osei', 'Kenji Sato'],
        documents: ['CLIA-Waiver-Brief.pdf'],
        profileViews: 162,
      },
    ],
    applications: [
      {
        id: 'app-1',
        expoId: 'expo-2026-global',
        exhibitorId: 'exh-1',
        companyName: 'Lumina Robotics',
        category: 'Robotics & AI',
        productsSummary: 'Lumina Arm M4 collaborative robot cell + live pick-and-place demo.',
        documents: ['ISO-10218-Safety-Cert.pdf', 'Booth-Power-Spec.pdf'],
        status: 'approved',
        submittedAt: isoDaysAgo(5),
      },
      {
        id: 'app-2',
        expoId: 'expo-2026-global',
        exhibitorId: 'exh-2',
        companyName: 'AetherGrid CleanTech',
        category: 'Clean Energy',
        productsSummary: 'AetherCell modular energy wall and GridPulse monitoring station.',
        documents: ['UL-9540-Compliance.pdf'],
        status: 'approved',
        submittedAt: isoDaysAgo(4),
      },
      {
        id: 'app-3',
        expoId: 'expo-2026-global',
        exhibitorId: 'exh-3',
        companyName: 'Sentinel Mesh Security',
        category: 'Cloud & Security',
        productsSummary: 'Hardware-attested zero-trust edge gateway live penetration lab.',
        documents: ['SOC2-Attestation.pdf', 'Demo-Network-Plan.pdf'],
        status: 'pending',
        submittedAt: isoDaysAgo(1),
      },
    ],
    registrations: [
      {
        id: 'reg-1',
        expoId: 'expo-2026-global',
        userId: 'usr-att-1',
        userName: 'Maya Patel',
        userEmail: 'attendee@eventsphere.io',
        ticketCode: 'ES-2026-8412',
        status: 'confirmed',
        registeredAt: isoDaysAgo(3),
      },
    ],
    sessions: [
      {
        id: 'ses-1',
        expoId: 'expo-2026-global',
        title: 'Opening Keynote: Real-Time Venues & Digital Twins',
        speaker: 'Elena Vance',
        speakerRole: 'Lead Expo Director, EventSphere',
        topic: 'Spatial Operations',
        startTime: '09:30',
        endTime: '10:30',
        location: 'Main Keynote Stage',
        capacity: 400,
        registeredUserIds: ['usr-att-1'],
        bookmarkedUserIds: ['usr-att-1'],
        updatedAt: now,
      },
      {
        id: 'ses-2',
        expoId: 'expo-2026-global',
        title: 'Tactile Cobots & Fleet Orchestration Workshop',
        speaker: 'Marcus Chen',
        speakerRole: 'VP Engineering, Lumina Robotics',
        topic: 'Robotics & AI',
        startTime: '11:00',
        endTime: '12:15',
        location: 'West Robotics Theater (near Booth A2)',
        capacity: 120,
        registeredUserIds: ['usr-att-1'],
        bookmarkedUserIds: [],
        updatedAt: now,
      },
      {
        id: 'ses-3',
        expoId: 'expo-2026-global',
        title: 'Decarbonizing Mega-Expos with Solid-State Microgrids',
        speaker: 'Sora Takahashi',
        speakerRole: 'Solutions Architect, AetherGrid',
        topic: 'Clean Energy',
        startTime: '13:30',
        endTime: '14:30',
        location: 'Central Atrium Stage',
        capacity: 180,
        registeredUserIds: [],
        bookmarkedUserIds: ['usr-att-1'],
        updatedAt: now,
      },
      {
        id: 'ses-4',
        expoId: 'expo-2026-global',
        title: 'Zero-Trust Edge Security for Connected Hardware',
        speaker: 'Aria Novak',
        speakerRole: 'Principal Security Engineer, Sentinel Mesh',
        topic: 'Cloud & Security',
        startTime: '15:15',
        endTime: '16:15',
        location: 'Enterprise Lab B',
        capacity: 90,
        registeredUserIds: [],
        bookmarkedUserIds: [],
        updatedAt: now,
      },
    ],
    speakers: [
      {
        id: 'spk-1',
        expoId: 'expo-2026-global',
        name: 'Elena Vance',
        role: 'Lead Expo Director',
        company: 'EventSphere Management',
        topic: 'Spatial Operations',
        bio: 'Architect of live 3D exhibition campuses and sub-2-second floor telemetry platforms.',
      },
      {
        id: 'spk-2',
        expoId: 'expo-2026-global',
        name: 'Marcus Chen',
        role: 'VP of Field Engineering',
        company: 'Lumina Robotics',
        topic: 'Robotics & AI',
        bio: 'Leads millimeter-accurate tactile cobot deployments across 40+ European fulfillment hubs.',
      },
      {
        id: 'spk-3',
        expoId: 'expo-2026-global',
        name: 'Sora Takahashi',
        role: 'Solutions Architect',
        company: 'AetherGrid CleanTech',
        topic: 'Clean Energy',
        bio: 'Designs high-density solid-state DC microgrids for zero-emission mega-venues.',
      },
      {
        id: 'spk-4',
        expoId: 'expo-2026-global',
        name: 'Aria Novak',
        role: 'Principal Security Engineer',
        company: 'Sentinel Mesh Security',
        topic: 'Cloud & Security',
        bio: 'Specializes in hardware-attested zero-trust identity fabrics for autonomous hardware.',
      },
    ],
    messages: [
      {
        id: 'msg-1',
        senderId: 'usr-exh-1',
        senderName: 'Marcus Chen (Lumina Robotics)',
        senderRole: 'exhibitor',
        recipientChannel: 'organizer',
        recipientLabel: 'Organizer Desk',
        body: 'Confirming 3-phase power drop at Booth A2 before setup opens at 07:00.',
        createdAt: isoDaysAgo(0) + 'T08:15:00.000Z',
      },
      {
        id: 'msg-2',
        senderId: 'usr-admin-1',
        senderName: 'Elena Vance (Organizer)',
        senderRole: 'admin',
        recipientChannel: 'organizer',
        recipientLabel: 'Organizer Desk',
        body: 'Confirmed Marcus — facilities crew has tagged Booth A2 for 32A power delivery.',
        createdAt: isoDaysAgo(0) + 'T08:22:00.000Z',
      },
    ],
    notifications: [
      {
        id: 'not-1',
        targetUserId: 'all',
        title: 'Live Floor Plan Synchronized',
        message: 'All 24 booths for NextGen Industrial & Tech Expo 2026 are live for real-time reservation.',
        kind: 'booth',
        readBy: [],
        createdAt: now,
      },
      {
        id: 'not-2',
        targetUserId: 'all',
        title: 'Keynote Reminder · 09:30',
        message: 'Opening Keynote: Real-Time Venues & Digital Twins begins at Main Keynote Stage.',
        kind: 'reminder',
        readBy: [],
        createdAt: now,
      },
    ],
    feedback: [
      {
        id: 'fb-1',
        userId: 'usr-att-1',
        userName: 'Maya Patel',
        category: 'Suggestion',
        message: 'Love being able to see booth A2 power & demo status directly on the 3D hall map.',
        createdAt: isoDaysAgo(1) + 'T14:20:00.000Z',
        status: 'resolved',
      },
    ],
    activityLogs: [
      {
        id: 'log-1',
        actor: 'Elena Vance (Admin)',
        action: 'EXPO_PUBLISHED',
        detail: 'Published NextGen Industrial & Tech Expo 2026 with 24 booths and 4 sessions.',
        timestamp: now,
      },
      {
        id: 'log-2',
        actor: 'Marcus Chen (Exhibitor)',
        action: 'BOOTH_RESERVED',
        detail: 'Atomically reserved Booth A2 (6x3m Corner) in North Innovation Wing.',
        timestamp: now,
      },
    ],
    analyticsSeries,
    concurrentUsers: 1,
  };
}
