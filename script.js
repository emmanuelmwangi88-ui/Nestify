/* ═══════════════════════════════════════════════
   LISTINGS DATA — KENYA-WIDE, ALL SUB-COUNTIES
═══════════════════════════════════════════════ */
// Images use Unsplash Kenya-relevant photography
const KE_IMGS = {
  // Nairobi apartments/urban
  apt1:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80&auto=format&fit=crop',
  apt2:'https://images.unsplash.com/photo-1560185008-b033106af5c3?w=600&q=80&auto=format&fit=crop',
  apt3:'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80&auto=format&fit=crop',
  apt4:'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80&auto=format&fit=crop',
  apt5:'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format&fit=crop',
  apt6:'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80&auto=format&fit=crop',
  // Houses/villas
  house1:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&auto=format&fit=crop',
  house2:'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80&auto=format&fit=crop',
  house3:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80&auto=format&fit=crop',
  house4:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80&auto=format&fit=crop',
  house5:'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80&auto=format&fit=crop',
  // Coastal/beach
  beach1:'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600&q=80&auto=format&fit=crop',
  beach2:'https://images.unsplash.com/photo-1589197331516-4d84b72ebde3?w=600&q=80&auto=format&fit=crop',
  beach3:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80&auto=format&fit=crop',
  // Lake region
  lake1:'https://images.unsplash.com/photo-1504205166486-5d3e16ce49c4?w=600&q=80&auto=format&fit=crop',
  // Rift Valley / highlands
  rift1:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80&auto=format&fit=crop',
  rift2:'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&q=80&auto=format&fit=crop',
  // Savanna / wildlife
  sav1:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80&auto=format&fit=crop',
  // Cottage / rural
  cot1:'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=600&q=80&auto=format&fit=crop',
  cot2:'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80&auto=format&fit=crop',
};

const listings = [
  // ── NAIROBI COUNTY ──
  {id:1,title:"Westlands Modern Apartment",location:"Westlands",county:"Nairobi",subcounty:"Westlands",
   type:"Apartment",price:85000,beds:2,baths:2,sqft:950,rating:4.8,reviews:34,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:true,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Furnished","Parking","Pet friendly","Gym access","Balcony"],
   highlight:"Stunning city views from the 8th floor",
   desc:"Bright corner apartment with panoramic city views. Recently renovated kitchen and bathrooms. Access to rooftop gym and residents' lounge. DSQ available. 100 Mbps fibre included.",
   img:KE_IMGS.apt1,modalImg:KE_IMGS.apt1.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Nairobi Hospital",detail:"General & specialist care",dist:"1.2 km"},
     {icon:"🛒",name:"Westgate Mall",detail:"Carrefour, Naivas, restaurants",dist:"0.6 km"},
     {icon:"🚌",name:"Westlands Terminus",detail:"Multiple matatu routes",dist:"200 m"},
     {icon:"🏫",name:"Westlands Primary",detail:"CBC curriculum",dist:"0.9 km"},
     {icon:"💡",name:"KPLC grid",detail:"Stable power supply",dist:"On-site"},
     {icon:"💧",name:"Nairobi Water",detail:"24/7 supply + rooftop tank",dist:"Piped"},
     {icon:"🌐",name:"Safaricom Fibre",detail:"100 Mbps in building",dist:"In unit"},
     {icon:"🏋️",name:"Westlands Gym",detail:"24hr fitness centre",dist:"0.3 km"},
   ]},
  {id:2,title:"Karen Family Villa",location:"Karen",county:"Nairobi",subcounty:"Langata",
   type:"Villa",price:195000,beds:4,baths:3,sqft:2800,rating:4.9,reviews:18,
   badge:"Premium",badgeClass:"badge-prem",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:true,
   tags:["Gated","Garden","DSQ","Borehole","Solar"],
   highlight:"Half-acre plot with mature garden",
   desc:"Spacious villa in a quiet cul-de-sac. Features borehole water, solar panels, DSQ, and double garage. Ideal for families seeking space and security. Close to Karen shopping centre.",
   img:KE_IMGS.house1,modalImg:KE_IMGS.house1.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Karen Hospital",detail:"Private hospital",dist:"2.1 km"},
     {icon:"🛒",name:"Karen Shopping Centre",detail:"Naivas, dining, pharmacy",dist:"1.8 km"},
     {icon:"🚌",name:"Matatu Route 111",detail:"CBD connections",dist:"0.4 km"},
     {icon:"🏫",name:"Hillcrest School",detail:"International curriculum",dist:"1.5 km"},
     {icon:"💡",name:"Solar + KPLC hybrid",detail:"Minimal outages, backup",dist:"On-site"},
     {icon:"💧",name:"Borehole on-site",detail:"Filtered, free of charge",dist:"On-site"},
     {icon:"🌿",name:"Landscape gardener",detail:"Weekly maintenance included",dist:"On compound"},
     {icon:"🔒",name:"24hr guard service",detail:"Trained security personnel",dist:"Gated entry"},
   ]},
  {id:3,title:"Kilimani Studio Loft",location:"Kilimani",county:"Nairobi",subcounty:"Dagoretti North",
   type:"Studio",price:38000,beds:1,baths:1,sqft:420,rating:4.6,reviews:52,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:false,parking:false,furnished:true,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Furnished","Fibre 100Mbps","Gym","Rooftop terrace"],
   highlight:"Smart studio with built-in workspace",
   desc:"Compact smart studio with custom built-in workspace, high-spec kitchen and smart TV. 100 Mbps fibre included. Access to rooftop gym and terrace. Perfect for young professionals.",
   img:KE_IMGS.apt3,modalImg:KE_IMGS.apt3.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Aga Khan Hospital",detail:"Premier facility",dist:"1.8 km"},
     {icon:"🛒",name:"Yaya Centre",detail:"Chandarana, boutiques",dist:"0.5 km"},
     {icon:"🚌",name:"Kilimani bus stop",detail:"Multiple routes",dist:"150 m"},
     {icon:"🏫",name:"Kilimani Academy",detail:"Top-rated primary",dist:"0.7 km"},
     {icon:"💡",name:"KPLC prepaid meter",detail:"Token top-up via M-Pesa",dist:"In unit"},
     {icon:"💧",name:"Piped + storage tank",detail:"Reliable supply",dist:"Piped"},
     {icon:"🌐",name:"Faiba fibre",detail:"100 Mbps, included in rent",dist:"In unit"},
     {icon:"🏋️",name:"Rooftop gym",detail:"Equipment + terrace views",dist:"6th floor"},
   ]},
  {id:6,title:"Runda Luxury Residence",location:"Runda",county:"Nairobi",subcounty:"Roysambu",
   type:"Villa",price:350000,beds:5,baths:4,sqft:4200,rating:5.0,reviews:11,
   badge:"Premium",badgeClass:"badge-prem",isNew:false,
   available:true,pet:true,parking:true,furnished:true,pool:true,beachfront:false,borehole:true,solar:true,
   tags:["Pool","Smart home","Generator","Staff quarters","Gym"],
   highlight:"Embassy-grade luxury with private pool",
   desc:"Exceptional gated villa with private pool, full home automation system, backup generator and immaculate landscaping. 24hr armed security. Perfect for ambassadors and executives.",
   img:KE_IMGS.house3,modalImg:KE_IMGS.house3.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"MP Shah Hospital",detail:"Private, multi-specialist",dist:"4 km"},
     {icon:"🛒",name:"Village Market",detail:"Upscale retail & dining",dist:"2 km"},
     {icon:"🚌",name:"Private shuttle",detail:"On-call concierge transport",dist:"On-call"},
     {icon:"🏫",name:"Rosslyn Academy",detail:"International school",dist:"1.2 km"},
     {icon:"💡",name:"Generator + KPLC",detail:"Zero power downtime",dist:"On-site"},
     {icon:"💧",name:"Borehole + municipal",detail:"Two independent sources",dist:"On-site"},
     {icon:"🏊",name:"Private pool",detail:"Heated, 12m, maintained weekly",dist:"On-plot"},
     {icon:"🤖",name:"Smart home system",detail:"Lighting, security, climate",dist:"Whole house"},
   ]},
  {id:10,title:"Kileleshwa Townhouse",location:"Kileleshwa",county:"Nairobi",subcounty:"Dagoretti North",
   type:"Townhouse",price:155000,beds:3,baths:3,sqft:1950,rating:4.8,reviews:16,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Gated","Garden","3 floors","Study room","Pet friendly"],
   highlight:"Architecturally striking 3-storey home",
   desc:"Modern 3-storey townhouse with rooftop terrace, private garden and study. Inside a secure gated estate of 8 units. Beautiful finishes throughout. 5 min walk to Hurlingham.",
   img:KE_IMGS.house2,modalImg:KE_IMGS.house2.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Nairobi Hospital",detail:"Level 6 facility",dist:"2.5 km"},
     {icon:"🛒",name:"Junction Mall",detail:"5-min drive",dist:"1.4 km"},
     {icon:"🚌",name:"Hurlingham stage",detail:"Multiple matatu routes",dist:"0.3 km"},
     {icon:"🏫",name:"St. Mary's School",detail:"Top national school",dist:"1 km"},
     {icon:"💡",name:"KPLC postpaid",detail:"Stable supply",dist:"On-site"},
     {icon:"💧",name:"Nairobi Water + tank",detail:"2000 litre storage",dist:"On-site"},
   ]},
  {id:11,title:"Ngong Road 2BR Apartment",location:"Ngong Road",county:"Nairobi",subcounty:"Dagoretti South",
   type:"Apartment",price:55000,beds:2,baths:1,sqft:780,rating:4.4,reviews:28,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Parking","Security","Good roads","Near hospital"],
   highlight:"Along the green Ngong Road corridor",
   desc:"Well-maintained apartment along Ngong Road with easy access to Karen, Dagoretti and CBD. Gated community with 24hr security guard. Ideal for commuters.",
   img:KE_IMGS.apt5,modalImg:KE_IMGS.apt5.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Kenyatta National Hospital",detail:"National referral",dist:"3 km"},
     {icon:"🛒",name:"T-Mall Ngong Rd",detail:"Supermarkets, food court",dist:"0.8 km"},
     {icon:"🚌",name:"Ngong Road stage",detail:"Frequent matatus to CBD",dist:"100 m"},
     {icon:"🏫",name:"Dagoretti High School",detail:"National school",dist:"1.5 km"},
   ]},
  {id:12,title:"Lavington 3BR House",location:"Lavington",county:"Nairobi",subcounty:"Dagoretti North",
   type:"House",price:130000,beds:3,baths:2,sqft:1500,rating:4.7,reviews:20,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:false,
   tags:["Borehole","Gated","Garden","Quiet","DSQ"],
   highlight:"Serene Lavington address with DSQ",
   desc:"Lovely standalone house in sought-after Lavington. Own borehole, large compound, DSQ for staff or guests. 5 minutes to Lavington Mall and Wangari Maathai Institute.",
   img:KE_IMGS.house4,modalImg:KE_IMGS.house4.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Nairobi Hospital",detail:"3 km away",dist:"3 km"},
     {icon:"🛒",name:"Lavington Mall",detail:"Carrefour, restaurants",dist:"0.5 km"},
     {icon:"🚌",name:"Lavington stage",detail:"Routes to CBD & Westlands",dist:"0.2 km"},
     {icon:"💧",name:"Borehole + NWSC",detail:"Dual water source",dist:"On-site"},
   ]},
  {id:13,title:"Ruaka Affordable Apartment",location:"Ruaka",county:"Kiambu",subcounty:"Limuru",
   type:"Apartment",price:22000,beds:2,baths:1,sqft:620,rating:4.3,reviews:41,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Parking","Good road","Near Nairobi"],
   highlight:"20 min from Westlands, half the price",
   desc:"Great value apartment in fast-growing Ruaka. Easy access to Nairobi via the Northern Bypass. Clean, secure and well-maintained. Ideal for young families and commuters.",
   img:KE_IMGS.apt4,modalImg:KE_IMGS.apt4.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Kiambu Level 5 Hospital",detail:"County hospital",dist:"5 km"},
     {icon:"🛒",name:"Ruaka Town",detail:"Naivas, shops, market",dist:"0.3 km"},
     {icon:"🚌",name:"Northern Bypass stage",detail:"Westlands 20 min",dist:"150 m"},
     {icon:"💡",name:"KPLC prepaid",detail:"M-Pesa top-up",dist:"On-site"},
   ]},
  {id:14,title:"South C Executive Apartment",location:"South C",county:"Nairobi",subcounty:"Makadara",
   type:"Apartment",price:48000,beds:2,baths:2,sqft:850,rating:4.5,reviews:32,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:true,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Furnished","Parking","Good security","Near airport"],
   highlight:"10 minutes to JKIA — perfect for frequent flyers",
   desc:"Tastefully furnished apartment in South C, Nairobi's well-connected residential hub. Close to JKIA, Mombasa Road businesses, and the CBD. Quiet compound with 24hr security.",
   img:KE_IMGS.apt6,modalImg:KE_IMGS.apt6.replace('w=600','w=900'),
   essentials:[
     {icon:"✈️",name:"JKIA Airport",detail:"10 min drive",dist:"6 km"},
     {icon:"🛒",name:"Capital Centre",detail:"Mombasa Rd shopping",dist:"1 km"},
     {icon:"🚌",name:"South C stage",detail:"CBD & airport routes",dist:"200 m"},
     {icon:"🏥",name:"Kenyatta National Hospital",detail:"Main referral hospital",dist:"4 km"},
   ]},

  // ── MOMBASA COUNTY ──
  {id:4,title:"Nyali Beachfront Apartment",location:"Nyali",county:"Mombasa",subcounty:"Nyali",
   type:"Beachfront",price:120000,beds:3,baths:2,sqft:1400,rating:4.9,reviews:31,
   badge:"Premium",badgeClass:"badge-prem",isNew:false,
   available:true,pet:false,parking:true,furnished:true,pool:true,beachfront:true,borehole:true,solar:false,
   tags:["Ocean views","Pool","Furnished","Air-conditioned","Beach access"],
   highlight:"Wake up to Indian Ocean sunrises every day",
   desc:"Stunning beachfront apartment in one of Mombasa's most sought-after addresses. Private beach access, infinity pool, and breathtaking ocean views. Air-conditioned throughout.",
   img:KE_IMGS.beach1,modalImg:KE_IMGS.beach1.replace('w=600','w=900'),
   essentials:[
     {icon:"🏖️",name:"Nyali Beach",detail:"Private beach access",dist:"0 m"},
     {icon:"🛒",name:"Nyali Centre",detail:"Carrefour, restaurants",dist:"1.2 km"},
     {icon:"🚌",name:"Matatu to CBD",detail:"Mombasa centre 20 min",dist:"0.4 km"},
     {icon:"🏥",name:"Pandya Hospital",detail:"Private facility",dist:"3 km"},
     {icon:"💡",name:"KPLC Coast grid",detail:"Backup generator",dist:"On-site"},
     {icon:"💧",name:"Piped + borehole",detail:"2 independent sources",dist:"On-site"},
     {icon:"🏊",name:"Infinity pool",detail:"Ocean-facing, heated",dist:"On-plot"},
     {icon:"🔒",name:"24hr security",detail:"Gated compound",dist:"Main gate"},
   ]},
  {id:15,title:"Old Town Heritage Apartment",location:"Old Town",county:"Mombasa",subcounty:"Mvita",
   type:"Apartment",price:35000,beds:2,baths:1,sqft:700,rating:4.3,reviews:14,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:false,parking:false,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Historic area","Character","Near ferry","Swahili culture"],
   highlight:"Live inside Mombasa's UNESCO heritage zone",
   desc:"Unique apartment inside Mombasa's historic Old Town. High ceilings, carved Swahili doors and original stonework. Steps from Fort Jesus Museum. A rare and special address.",
   img:KE_IMGS.cot1,modalImg:KE_IMGS.cot1.replace('w=600','w=900'),
   essentials:[
     {icon:"🏛️",name:"Fort Jesus Museum",detail:"UNESCO World Heritage Site",dist:"200 m"},
     {icon:"🚢",name:"Likoni Ferry",detail:"Mainland connections",dist:"0.4 km"},
     {icon:"🛒",name:"Old Town Market",detail:"Fresh produce & curios",dist:"100 m"},
     {icon:"🏥",name:"Coast General Hospital",detail:"Main county hospital",dist:"2 km"},
   ]},
  {id:16,title:"Bamburi Beach Apartment",location:"Bamburi",county:"Mombasa",subcounty:"Kisauni",
   type:"Beachfront",price:75000,beds:2,baths:2,sqft:900,rating:4.6,reviews:23,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:true,pool:true,beachfront:true,borehole:false,solar:false,
   tags:["Beach access","Pool","Furnished","Air-conditioned","Resort feel"],
   highlight:"Resort-style living on Bamburi beach",
   desc:"Beautiful furnished apartment inside a resort complex on Bamburi beach. Pool, gym, restaurant and direct beach access all included. 5 minutes from Haller Park nature reserve.",
   img:KE_IMGS.beach3,modalImg:KE_IMGS.beach3.replace('w=600','w=900'),
   essentials:[
     {icon:"🏖️",name:"Bamburi Beach",detail:"Direct beach access",dist:"50 m"},
     {icon:"🌿",name:"Haller Park",detail:"Wildlife & nature reserve",dist:"0.5 km"},
     {icon:"🛒",name:"Bamburi Shopping",detail:"Supermarket & restaurants",dist:"0.8 km"},
     {icon:"🏥",name:"Mombasa Hospital",detail:"Private facility",dist:"4 km"},
   ]},

  // ── KWALE COUNTY ──
  {id:9,title:"Diani Beachfront Villa",location:"Diani Beach",county:"Kwale",subcounty:"Msambweni",
   type:"Beachfront",price:280000,beds:4,baths:3,sqft:3000,rating:5.0,reviews:8,
   badge:"Premium",badgeClass:"badge-prem",isNew:false,
   available:true,pet:true,parking:true,furnished:true,pool:true,beachfront:true,borehole:true,solar:true,
   tags:["Beachfront","Private pool","Coral reef","Furnished","Staff quarters"],
   highlight:"Directly on Diani's white sand beach",
   desc:"Extraordinary beachfront villa sitting on one of Africa's most beautiful beaches. Direct beach access, private pool, lush tropical garden and full staff. Solar powered.",
   img:KE_IMGS.beach2,modalImg:KE_IMGS.beach2.replace('w=600','w=900'),
   essentials:[
     {icon:"🏖️",name:"Diani Beach",detail:"Directly on the beach",dist:"0 m"},
     {icon:"🛒",name:"Diani Shopping Centre",detail:"Supermarket, pharmacy",dist:"2 km"},
     {icon:"✈️",name:"Ukunda Airstrip",detail:"Daily flights to Nairobi",dist:"3 km"},
     {icon:"🏥",name:"Diani Beach Hospital",detail:"Private medical care",dist:"2.5 km"},
     {icon:"💡",name:"Solar + generator",detail:"Uninterrupted supply",dist:"On-site"},
     {icon:"💧",name:"Borehole + treated",detail:"Pure water always",dist:"On-site"},
     {icon:"🏊",name:"Private pool",detail:"Saltwater infinity pool",dist:"Garden"},
     {icon:"🔒",name:"Live-in security",detail:"Armed guard + CCTV",dist:"On-site"},
   ]},
  {id:17,title:"Ukunda Bungalow",location:"Ukunda",county:"Kwale",subcounty:"Matuga",
   type:"Bungalow",price:30000,beds:3,baths:2,sqft:900,rating:4.2,reviews:9,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:true,
   tags:["Borehole","Solar","Large compound","Affordable","Near Diani"],
   highlight:"Gateway to Diani Beach at half the price",
   desc:"Spacious bungalow in Ukunda town. 10 min drive to Diani beach. Own borehole and solar panels for energy independence. Ideal for families wanting coastal living on a budget.",
   img:KE_IMGS.cot2,modalImg:KE_IMGS.cot2.replace('w=600','w=900'),
   essentials:[
     {icon:"🏖️",name:"Diani Beach",detail:"10 min drive",dist:"5 km"},
     {icon:"🛒",name:"Ukunda Market",detail:"Fresh produce & shops",dist:"0.3 km"},
     {icon:"✈️",name:"Ukunda Airstrip",detail:"Small aircraft to Nairobi",dist:"1 km"},
     {icon:"💧",name:"Borehole on-site",detail:"Clean filtered water",dist:"On-site"},
   ]},

  // ── KISUMU COUNTY ──
  {id:5,title:"Milimani Executive Apartment",location:"Milimani",county:"Kisumu",subcounty:"Kisumu East",
   type:"Apartment",price:45000,beds:2,baths:2,sqft:800,rating:4.5,reviews:19,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:true,parking:true,furnished:true,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Lake views","Furnished","Parking","Fibre internet","Quiet area"],
   highlight:"Overlooking Lake Victoria from the balcony",
   desc:"Executive apartment in Kisumu's most prestigious residential address. Beautiful Lake Victoria views from the balcony. Close to business district, hospitals and shopping.",
   img:KE_IMGS.lake1,modalImg:KE_IMGS.lake1.replace('w=600','w=900'),
   essentials:[
     {icon:"🌊",name:"Lake Victoria",detail:"Views + waterfront walks",dist:"2 km"},
     {icon:"🛒",name:"Mega City Mall",detail:"Naivas, restaurants, cinema",dist:"1.5 km"},
     {icon:"🚌",name:"Kisumu CBD route",detail:"Regular matatu service",dist:"0.3 km"},
     {icon:"🏥",name:"Aga Khan Kisumu",detail:"Specialist hospital",dist:"1.1 km"},
     {icon:"💡",name:"KPLC grid",detail:"Stable supply",dist:"On-site"},
     {icon:"💧",name:"Kisumu Water",detail:"24hr piped supply",dist:"Piped"},
   ]},
  {id:18,title:"Tom Mboya Estate House",location:"Tom Mboya Estate",county:"Kisumu",subcounty:"Kisumu Central",
   type:"House",price:25000,beds:3,baths:2,sqft:900,rating:4.1,reviews:11,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Garden","Near CBD","Parking","Family friendly"],
   highlight:"Central Kisumu at a great price",
   desc:"Well-maintained family house in Tom Mboya Estate. Walking distance to Kisumu CBD, markets and schools. Spacious compound suitable for children. Security fence and metal gate.",
   img:KE_IMGS.house5,modalImg:KE_IMGS.house5.replace('w=600','w=900'),
   essentials:[
     {icon:"🌊",name:"Lake Victoria",detail:"3 km away",dist:"3 km"},
     {icon:"🛒",name:"Kisumu Market",detail:"Largest open market in Western Kenya",dist:"0.5 km"},
     {icon:"🚌",name:"Kisumu CBD stage",detail:"All routes",dist:"200 m"},
     {icon:"🏥",name:"Jaramogi Hospital",detail:"Main government referral",dist:"1.2 km"},
   ]},
  {id:19,title:"Mamboleo New Apartment",location:"Mamboleo",county:"Kisumu",subcounty:"Kisumu West",
   type:"Apartment",price:18000,beds:1,baths:1,sqft:450,rating:4.0,reviews:7,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:false,parking:false,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","New build","Quiet","Near main road"],
   highlight:"Brand new build — first tenants only",
   desc:"Newly completed 1-bedroom apartment in Mamboleo area. Clean finishes, private bathroom, small veranda. 20 minutes to Kisumu CBD by matatu. First tenants get one month free.",
   img:KE_IMGS.apt2,modalImg:KE_IMGS.apt2.replace('w=600','w=900'),
   essentials:[
     {icon:"🚌",name:"Mamboleo stage",detail:"Kisumu CBD 20 min",dist:"100 m"},
     {icon:"🛒",name:"Mamboleo Market",detail:"Local market & shops",dist:"0.2 km"},
     {icon:"🏥",name:"Kisumu County Hospital",detail:"Public facility",dist:"5 km"},
   ]},

  // ── NAKURU COUNTY ──
  {id:7,title:"Nakuru Highlands Cottage",location:"Milimani",county:"Nakuru",subcounty:"Nakuru East",
   type:"Cottage",price:35000,beds:3,baths:2,sqft:1100,rating:4.7,reviews:22,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:true,
   tags:["Large garden","Mountain views","Quiet","Borehole","Solar"],
   highlight:"Panoramic views of the Rift Valley escarpment",
   desc:"Charming stone cottage with large garden and breathtaking Rift Valley views. Solar and borehole independent of utility supply. Perfect for families or remote workers.",
   img:KE_IMGS.rift1,modalImg:KE_IMGS.rift1.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Nakuru Level 5 Hospital",detail:"Main government hospital",dist:"3 km"},
     {icon:"🛒",name:"Nakuru Town Centre",detail:"Naivas, shops, market",dist:"2.5 km"},
     {icon:"🚌",name:"Matatu stage",detail:"Multiple routes to CBD",dist:"0.5 km"},
     {icon:"🏫",name:"Nakuru Boys HS",detail:"National school",dist:"2 km"},
     {icon:"💡",name:"Solar primary + KPLC",detail:"Minimal load shedding",dist:"On-site"},
     {icon:"💧",name:"Borehole on-site",detail:"Pure spring water",dist:"On-site"},
   ]},
  {id:20,title:"Flamingo Estate Apartment",location:"Flamingo",county:"Nakuru",subcounty:"Nakuru West",
   type:"Apartment",price:20000,beds:2,baths:1,sqft:580,rating:4.2,reviews:17,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Parking","Security","Near schools","Lake Nakuru nearby"],
   highlight:"Minutes from Lake Nakuru flamingo viewing",
   desc:"Clean, affordable apartment in Flamingo Estate. Walking distance to local schools, shops and matatu stages. Lake Nakuru National Park 15 minutes away. Ideal for civil servants and teachers.",
   img:KE_IMGS.apt1,modalImg:KE_IMGS.apt1.replace('w=600','w=900'),
   essentials:[
     {icon:"🦩",name:"Lake Nakuru NP",detail:"Famous flamingo lake",dist:"5 km"},
     {icon:"🛒",name:"Flamingo Shopping",detail:"Shops & pharmacy",dist:"0.2 km"},
     {icon:"🚌",name:"Flamingo stage",detail:"Town routes",dist:"100 m"},
     {icon:"🏥",name:"Rift Valley Hospital",detail:"Private facility",dist:"3 km"},
   ]},
  {id:21,title:"Naivasha Lakeside Cottage",location:"Naivasha Town",county:"Nakuru",subcounty:"Naivasha",
   type:"Cottage",price:28000,beds:2,baths:1,sqft:750,rating:4.5,reviews:13,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:true,
   tags:["Lake views","Borehole","Solar","Peaceful","Flower farms nearby"],
   highlight:"Peaceful lakeside living in flower country",
   desc:"Lovely cottage in Naivasha with views across Lake Naivasha. Own borehole and solar. Nearby hippo walks along the lake shore. Great for nature lovers and remote workers.",
   img:KE_IMGS.rift2,modalImg:KE_IMGS.rift2.replace('w=600','w=900'),
   essentials:[
     {icon:"🌊",name:"Lake Naivasha",detail:"Hippos & bird watching",dist:"1.5 km"},
     {icon:"🛒",name:"Naivasha Town",detail:"Main shopping area",dist:"2 km"},
     {icon:"🚌",name:"Naivasha stage",detail:"Nairobi 1hr 40min",dist:"1 km"},
     {icon:"🏥",name:"Naivasha Hospital",detail:"County hospital",dist:"3 km"},
   ]},

  // ── UASIN GISHU COUNTY (Eldoret) ──
  {id:8,title:"Eldoret Town Apartment",location:"Elgon View",county:"Uasin Gishu",subcounty:"Kapseret",
   type:"Apartment",price:28000,beds:2,baths:1,sqft:680,rating:4.4,reviews:15,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Near university","Affordable","Parking","Good security"],
   highlight:"Close to Moi University and business hub",
   desc:"Clean modern apartment in Eldoret's best residential suburb. Walking distance to Moi University, hospitals, and major supermarkets. Ideal for professionals and families.",
   img:KE_IMGS.apt5,modalImg:KE_IMGS.apt5.replace('w=600','w=900'),
   essentials:[
     {icon:"🏥",name:"Moi Teaching Hospital",detail:"Kenya's 2nd largest referral",dist:"1.5 km"},
     {icon:"🛒",name:"Eldoret Town",detail:"Nakumatt, open market",dist:"1.8 km"},
     {icon:"🚌",name:"Elgon View stage",detail:"Town routes",dist:"0.2 km"},
     {icon:"🏫",name:"Moi University",detail:"Top 5 Kenyan university",dist:"0.8 km"},
     {icon:"💡",name:"KPLC postpaid",detail:"Stable supply",dist:"On-site"},
     {icon:"💧",name:"Town water + tank",detail:"24hr supply",dist:"Piped"},
   ]},
  {id:22,title:"Langas Estate House",location:"Langas",county:"Uasin Gishu",subcounty:"Eldoret East",
   type:"House",price:18000,beds:3,baths:2,sqft:850,rating:4.2,reviews:12,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Garden","Family friendly","Near market"],
   highlight:"Space and value in Eldoret's largest estate",
   desc:"Spacious family house in Langas, Eldoret's most established residential estate. Large compound, good water supply, and easy matatu access to town. Great for families.",
   img:KE_IMGS.house5,modalImg:KE_IMGS.house5.replace('w=600','w=900'),
   essentials:[
     {icon:"🚌",name:"Langas stage",detail:"Eldoret CBD 15 min",dist:"100 m"},
     {icon:"🛒",name:"Langas Market",detail:"Fresh produce daily",dist:"0.3 km"},
     {icon:"🏥",name:"Moi Teaching Hospital",detail:"Full referral hospital",dist:"4 km"},
     {icon:"🏫",name:"Langas Primary",detail:"Good CBC school",dist:"0.5 km"},
   ]},

  // ── MERU COUNTY ──
  {id:23,title:"Meru Town Apartment",location:"Meru Town",county:"Meru",subcounty:"Imenti North",
   type:"Apartment",price:20000,beds:2,baths:1,sqft:600,rating:4.3,reviews:9,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:true,
   tags:["Solar","Parking","Near Mt Kenya","Cool climate","Affordable"],
   highlight:"Cool highland air at the foot of Mt Kenya",
   desc:"Modern apartment in Meru town centre with solar backup. Enjoy cool Mount Kenya highland climate. Close to Meru CBD, bus stage and main market. Ideal for civil servants.",
   img:KE_IMGS.rift1,modalImg:KE_IMGS.rift1.replace('w=600','w=900'),
   essentials:[
     {icon:"⛰️",name:"Mount Kenya",detail:"Views on clear days",dist:"20 km"},
     {icon:"🛒",name:"Meru Town Market",detail:"Major market town",dist:"0.3 km"},
     {icon:"🚌",name:"Meru Stage",detail:"Nairobi 4hrs by bus",dist:"0.2 km"},
     {icon:"🏥",name:"Meru Level 5 Hospital",detail:"County referral",dist:"1.5 km"},
   ]},
  {id:24,title:"Nkubu Maisonette",location:"Nkubu",county:"Meru",subcounty:"Imenti South",
   type:"Maisonette",price:22000,beds:3,baths:2,sqft:950,rating:4.0,reviews:6,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:true,
   tags:["Borehole","Solar","Large garden","Khat country","Farm air"],
   highlight:"Peaceful rural-urban maisonette with clean air",
   desc:"Lovely maisonette in Nkubu, Imenti South. Own borehole, solar panels and kitchen garden. The cool Meru highlands make this perfect for those seeking healthy living and fresh air.",
   img:KE_IMGS.house4,modalImg:KE_IMGS.house4.replace('w=600','w=900'),
   essentials:[
     {icon:"🌿",name:"Meru National Park",detail:"Famous wildlife destination",dist:"40 km"},
     {icon:"🛒",name:"Nkubu Market",detail:"Busy weekly market",dist:"0.1 km"},
     {icon:"🚌",name:"Nkubu stage",detail:"Meru 30 min by matatu",dist:"0.1 km"},
     {icon:"🏥",name:"Nkubu Hospital",detail:"Sub-county hospital",dist:"0.5 km"},
   ]},

  // ── KIAMBU COUNTY ──
  {id:25,title:"Thika Greens Apartment",location:"Thika Town",county:"Kiambu",subcounty:"Thika Town",
   type:"Apartment",price:25000,beds:2,baths:1,sqft:650,rating:4.2,reviews:18,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Industrial hub","Affordable","Good water","Near Nairobi"],
   highlight:"Thika's rising star neighbourhood",
   desc:"Clean apartment in Thika town with reliable water supply. Thika is Kenya's fastest-growing satellite city — 45 minutes to Nairobi CBD via Thika Superhighway. Strong rental demand.",
   img:KE_IMGS.apt4,modalImg:KE_IMGS.apt4.replace('w=600','w=900'),
   essentials:[
     {icon:"🚌",name:"Thika Superhighway",detail:"Nairobi 45 min",dist:"0.5 km"},
     {icon:"🛒",name:"Blue Nile & Nile Mall",detail:"Shopping centres",dist:"0.8 km"},
     {icon:"🏥",name:"Thika Level 5 Hospital",detail:"Major county hospital",dist:"2 km"},
     {icon:"🏭",name:"Thika Road Industries",detail:"Major employment zone",dist:"3 km"},
   ]},
  {id:26,title:"Karura Gated Villa",location:"Karura",county:"Kiambu",subcounty:"Kiambaa",
   type:"Villa",price:160000,beds:4,baths:3,sqft:2400,rating:4.8,reviews:12,
   badge:"Premium",badgeClass:"badge-prem",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:true,beachfront:false,borehole:true,solar:true,
   tags:["Pool","Borehole","Solar","Gated estate","Karura Forest"],
   highlight:"Back garden opens onto Karura Forest",
   desc:"Exceptional 4-bedroom villa backing onto the Karura Forest buffer zone. Private pool, borehole and solar. Inside a tight-knit gated community of 12 villas. Jogging trails at doorstep.",
   img:KE_IMGS.house3,modalImg:KE_IMGS.house3.replace('w=600','w=900'),
   essentials:[
     {icon:"🌲",name:"Karura Forest",detail:"Kenya's urban forest retreat",dist:"Backing"},
     {icon:"🛒",name:"Village Market",detail:"Premium retail & dining",dist:"2 km"},
     {icon:"🚌",name:"Limuru Road stage",detail:"Westlands 15 min",dist:"0.5 km"},
     {icon:"🏥",name:"MP Shah Hospital",detail:"Private specialist hospital",dist:"4 km"},
   ]},

  // ── KAJIADO COUNTY ──
  {id:27,title:"Kitengela Family Home",location:"Kitengela",county:"Kajiado",subcounty:"Kajiado North",
   type:"House",price:30000,beds:3,baths:2,sqft:1100,rating:4.4,reviews:21,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:true,
   tags:["Solar","Large garden","Family friendly","Near SGR","Affordable"],
   highlight:"Near SGR station — Nairobi 20 min by train",
   desc:"Spacious family home in booming Kitengela. Solar powered. Near Syokimau SGR station for fast Nairobi commute. Wildlife occasionally visible from upper floor. Great value.",
   img:KE_IMGS.house5,modalImg:KE_IMGS.house5.replace('w=600','w=900'),
   essentials:[
     {icon:"🚂",name:"Syokimau SGR",detail:"Nairobi CBD 20 min",dist:"4 km"},
     {icon:"🛒",name:"Kitengela Town",detail:"Multiple malls & shops",dist:"0.5 km"},
     {icon:"🏥",name:"Shalom Hospital",detail:"Private hospital",dist:"2 km"},
     {icon:"🦒",name:"Nairobi NP",detail:"Wildlife visible from outskirts",dist:"8 km"},
   ]},
  {id:28,title:"Ngong Hills Cottage",location:"Ngong Town",county:"Kajiado",subcounty:"Ngong",
   type:"Cottage",price:32000,beds:2,baths:1,sqft:800,rating:4.6,reviews:14,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:true,
   tags:["Ngong Hills views","Borehole","Solar","Cool climate","Hiking trails"],
   highlight:"At the foot of the Ngong Hills — stunning views",
   desc:"Charming stone cottage below the famous Ngong Hills. Own borehole and solar, large garden, cool highland climate. Hiking trails start from the gate. 40 min to Nairobi CBD.",
   img:KE_IMGS.cot1,modalImg:KE_IMGS.cot1.replace('w=600','w=900'),
   essentials:[
     {icon:"⛰️",name:"Ngong Hills",detail:"Hiking and Maasai culture",dist:"2 km"},
     {icon:"🛒",name:"Ngong Town",detail:"Market & supermarkets",dist:"0.5 km"},
     {icon:"🚌",name:"Ngong stage",detail:"Nairobi CBD 1hr matatu",dist:"0.2 km"},
     {icon:"🏥",name:"Ngong Hospital",detail:"Sub-county hospital",dist:"1 km"},
   ]},

  // ── MACHAKOS COUNTY ──
  {id:29,title:"Athi River Apartment",location:"Athi River",county:"Machakos",subcounty:"Mavoko",
   type:"Apartment",price:16000,beds:2,baths:1,sqft:560,rating:4.0,reviews:25,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Industrial area","Affordable","Near SGR","Easy commute"],
   highlight:"Great value — Nairobi CBD just 30 min on SGR",
   desc:"Affordable apartment in Athi River / Mavoko. Near major EPZ factories and the SGR station. Best value per sqft in greater Nairobi. Reliable water via NWC Mavoko.",
   img:KE_IMGS.apt2,modalImg:KE_IMGS.apt2.replace('w=600','w=900'),
   essentials:[
     {icon:"🚂",name:"Athi River SGR",detail:"Nairobi CBD 30 min",dist:"1.5 km"},
     {icon:"🛒",name:"Athi River Town",detail:"Market & shops",dist:"0.4 km"},
     {icon:"🏭",name:"Export Processing Zone",detail:"Major employment area",dist:"2 km"},
     {icon:"🏥",name:"Athi River Hospital",detail:"Sub-county hospital",dist:"2 km"},
   ]},
  {id:30,title:"Machakos Town Maisonette",location:"Machakos Town",county:"Machakos",subcounty:"Machakos Town",
   type:"Maisonette",price:28000,beds:3,baths:2,sqft:1000,rating:4.3,reviews:10,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:true,
   tags:["Solar","Garden","Good security","Near hospital"],
   highlight:"Capital city of Machakos County",
   desc:"Well-built maisonette in Machakos town centre. Solar backup, secure compound, good hospitals nearby. Machakos is a vibrant county capital with excellent infrastructure for eastern Kenya.",
   img:KE_IMGS.house2,modalImg:KE_IMGS.house2.replace('w=600','w=900'),
   essentials:[
     {icon:"🛒",name:"Machakos People's Park",detail:"Kenya's flagship park",dist:"2 km"},
     {icon:"🚌",name:"Machakos Bus Park",detail:"Nairobi 1hr 30min",dist:"0.5 km"},
     {icon:"🏥",name:"Machakos Level 5",detail:"County referral hospital",dist:"1.5 km"},
   ]},

  // ── LAMU COUNTY ──
  {id:31,title:"Lamu Island Swahili House",location:"Lamu Town",county:"Lamu",subcounty:"Lamu East",
   type:"House",price:65000,beds:3,baths:2,sqft:1100,rating:4.9,reviews:8,
   badge:"Premium",badgeClass:"badge-prem",isNew:false,
   available:true,pet:false,parking:false,furnished:true,pool:false,beachfront:true,borehole:false,solar:true,
   tags:["UNESCO World Heritage","Swahili architecture","Sea breeze","No cars","Solar"],
   highlight:"A UNESCO World Heritage home on Africa's oldest town",
   desc:"Authentic Swahili townhouse in Lamu Old Town — a UNESCO World Heritage Site. Carved wooden doors, coral-stone walls, rooftop terrace with ocean breezes. No cars on Lamu island — only donkeys!",
   img:KE_IMGS.cot2,modalImg:KE_IMGS.cot2.replace('w=600','w=900'),
   essentials:[
     {icon:"🏛️",name:"Lamu Old Town",detail:"UNESCO World Heritage",dist:"Walking distance"},
     {icon:"🏖️",name:"Shela Beach",detail:"Pristine white sand beach",dist:"2 km by dhow"},
     {icon:"✈️",name:"Manda Island Airport",detail:"Daily Nairobi flights",dist:"Boat across"},
     {icon:"🐪",name:"Donkey rides",detail:"Main transport on island",dist:"Town"},
   ]},

  // ── EMBU COUNTY ──
  {id:32,title:"Embu Town Apartment",location:"Embu Town",county:"Embu",subcounty:"Manyatta",
   type:"Apartment",price:18000,beds:2,baths:1,sqft:560,rating:4.1,reviews:8,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Near Tana River","Cool","Good schools"],
   highlight:"Gateway to Mount Kenya's eastern slopes",
   desc:"Affordable apartment in Embu town. Clean highland air, good water supply and excellent schools. Embu is a growing county capital with improving infrastructure. Close to Mt Kenya.",
   img:KE_IMGS.apt3,modalImg:KE_IMGS.apt3.replace('w=600','w=900'),
   essentials:[
     {icon:"⛰️",name:"Mount Kenya",detail:"Snow-capped peak visible",dist:"20 km"},
     {icon:"🛒",name:"Embu Town Market",detail:"Large market town",dist:"0.3 km"},
     {icon:"🚌",name:"Embu Bus Stage",detail:"Nairobi 2hrs 30min",dist:"0.2 km"},
     {icon:"🏥",name:"Embu Level 5 Hospital",detail:"Main county hospital",dist:"1.5 km"},
   ]},

  // ── NYERI COUNTY ──
  {id:33,title:"Nyeri Town House",location:"Nyeri Town",county:"Nyeri",subcounty:"Nyeri Town",
   type:"House",price:35000,beds:3,baths:2,sqft:1000,rating:4.5,reviews:11,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:true,
   tags:["Mt Kenya views","Solar","Cool climate","Good schools","Famous coffee"],
   highlight:"In the shadow of Mount Kenya — stunning scenery",
   desc:"Lovely 3-bedroom house in Nyeri, Kenya's coffee capital. Stunning Mount Kenya views. Solar backup, good schools and hospitals nearby. The home of Kenya's most famous freedom fighter Dedan Kimathi.",
   img:KE_IMGS.rift2,modalImg:KE_IMGS.rift2.replace('w=600','w=900'),
   essentials:[
     {icon:"⛰️",name:"Mount Kenya NP",detail:"UNESCO World Heritage Site",dist:"30 km"},
     {icon:"☕",name:"Nyeri Coffee Estates",detail:"World-famous highland coffee",dist:"10 km"},
     {icon:"🛒",name:"Nyeri Town",detail:"Well-stocked market town",dist:"0.5 km"},
     {icon:"🏥",name:"Nyeri Level 5 Hospital",detail:"County referral",dist:"2 km"},
   ]},

  // ── TRANS-NZOIA COUNTY ──
  {id:34,title:"Kitale Town Apartment",location:"Kitale Town",county:"Trans-Nzoia",subcounty:"Kiminini",
   type:"Apartment",price:16000,beds:2,baths:1,sqft:540,rating:4.0,reviews:6,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Farming country","Cool","Mt Elgon views"],
   highlight:"Bread basket of Kenya — rich farming region",
   desc:"Affordable apartment in Kitale, the agricultural capital of western Kenya. Views of Mount Elgon on clear days. Excellent food markets nearby. Clean highland air and cool climate.",
   img:KE_IMGS.apt1,modalImg:KE_IMGS.apt1.replace('w=600','w=900'),
   essentials:[
     {icon:"⛰️",name:"Mount Elgon",detail:"Cross-border volcanic peak",dist:"40 km"},
     {icon:"🌾",name:"Kitale Market",detail:"Huge agricultural market",dist:"0.3 km"},
     {icon:"🚌",name:"Kitale Stage",detail:"Eldoret 1hr, Nairobi 6hrs",dist:"0.2 km"},
     {icon:"🏥",name:"Trans-Nzoia Hospital",detail:"County hospital",dist:"2 km"},
   ]},

  // ── BUNGOMA COUNTY ──
  {id:35,title:"Bungoma Town House",location:"Bungoma Town",county:"Bungoma",subcounty:"Bungoma East",
   type:"House",price:20000,beds:3,baths:2,sqft:850,rating:4.1,reviews:8,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Family friendly","Near university","Garden","Good food"],
   highlight:"County capital with great community feel",
   desc:"Good family home in Bungoma town. Close to Kibabii University and main market. Friendly neighbourhood, good schools, and reliable water. Western Kenya's commercial hub.",
   img:KE_IMGS.house5,modalImg:KE_IMGS.house5.replace('w=600','w=900'),
   essentials:[
     {icon:"🏫",name:"Kibabii University",detail:"County university",dist:"3 km"},
     {icon:"🛒",name:"Bungoma Town Market",detail:"Large market",dist:"0.3 km"},
     {icon:"🚌",name:"Bungoma Stage",detail:"Eldoret 2hrs, Nairobi 7hrs",dist:"0.2 km"},
     {icon:"🏥",name:"Bungoma Level 5 Hospital",detail:"County hospital",dist:"1.5 km"},
   ]},

  // ── SIAYA COUNTY ──
  {id:36,title:"Siaya Town Apartment",location:"Siaya Town",county:"Siaya",subcounty:"Siaya Town",
   type:"Apartment",price:14000,beds:2,baths:1,sqft:500,rating:3.9,reviews:5,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:false,parking:false,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Lake region","Growing town"],
   highlight:"Fast-growing county capital near Lake Victoria",
   desc:"Budget-friendly apartment in Siaya, a growing county capital in the lake region. Easy access to Kisumu city (1 hour). Friendly community and lower cost of living. Good for teachers and healthcare workers.",
   img:KE_IMGS.apt5,modalImg:KE_IMGS.apt5.replace('w=600','w=900'),
   essentials:[
     {icon:"🌊",name:"Lake Victoria",detail:"1hr drive to lake shore",dist:"30 km"},
     {icon:"🛒",name:"Siaya Market",detail:"County market",dist:"0.2 km"},
     {icon:"🚌",name:"Siaya Stage",detail:"Kisumu 1hr",dist:"0.1 km"},
     {icon:"🏥",name:"Siaya County Hospital",detail:"County referral",dist:"1 km"},
   ]},

  // ── GARISSA COUNTY ──
  {id:37,title:"Garissa Executive Apartment",location:"Garissa Town",county:"Garissa",subcounty:"Garissa Township",
   type:"Apartment",price:22000,beds:2,baths:1,sqft:620,rating:4.0,reviews:4,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:true,
   tags:["Solar","AC ready","County capital","Government hub"],
   highlight:"Main administrative hub of North Eastern Kenya",
   desc:"Decent apartment in Garissa, the gateway to northeastern Kenya. Solar backup, AC-ready rooms. Suits government staff, NGO workers and business people serving the region.",
   img:KE_IMGS.apt6,modalImg:KE_IMGS.apt6.replace('w=600','w=900'),
   essentials:[
     {icon:"🌅",name:"Tana River",detail:"Scenic river views",dist:"5 km"},
     {icon:"🛒",name:"Garissa Town",detail:"Market & shops",dist:"0.5 km"},
     {icon:"✈️",name:"Garissa Airstrip",detail:"Daily Nairobi flights",dist:"3 km"},
     {icon:"🏥",name:"Garissa County Hospital",detail:"Regional referral hospital",dist:"1 km"},
   ]},

  // ── HOMA BAY COUNTY ──
  {id:38,title:"Homa Bay Lakeside House",location:"Homa Bay Town",county:"Homa Bay",subcounty:"Homa Bay Town",
   type:"House",price:20000,beds:3,baths:2,sqft:900,rating:4.2,reviews:7,
   badge:"New listing",badgeClass:"badge-new",isNew:true,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:true,
   tags:["Lake views","Solar","Family home","Near lake fishing"],
   highlight:"Watch the sun set over Lake Victoria from your veranda",
   desc:"Well-maintained house in Homa Bay with partial Lake Victoria views. Solar backup, spacious compound. Great for fishing enthusiasts — boat hire available nearby. Affordable lakeside living.",
   img:KE_IMGS.lake1,modalImg:KE_IMGS.lake1.replace('w=600','w=900'),
   essentials:[
     {icon:"🌊",name:"Lake Victoria",detail:"Fishing & sunset views",dist:"3 km"},
     {icon:"🛒",name:"Homa Bay Town",detail:"Market & shops",dist:"0.5 km"},
     {icon:"🚌",name:"Homa Bay Stage",detail:"Kisumu 2hrs",dist:"0.3 km"},
     {icon:"🏥",name:"Homa Bay County Hospital",detail:"County hospital",dist:"1.5 km"},
   ]},

  // ── VIHIGA COUNTY ──
  {id:39,title:"Vihiga Highlands Cottage",location:"Mbale Town",county:"Vihiga",subcounty:"Vihiga",
   type:"Cottage",price:16000,beds:2,baths:1,sqft:600,rating:4.1,reviews:5,
   badge:"Available",badgeClass:"badge-avail",isNew:false,
   available:true,pet:true,parking:true,furnished:false,pool:false,beachfront:false,borehole:true,solar:false,
   tags:["Borehole","Cool climate","Tea country","Quiet","Affordable"],
   highlight:"Lush green hills and cool highland air",
   desc:"Cosy cottage in Vihiga's lush highlands — one of Kenya's most densely populated and beautiful counties. Own borehole. Surrounded by tea farms and rolling green hills.",
   img:KE_IMGS.rift2,modalImg:KE_IMGS.rift2.replace('w=600','w=900'),
   essentials:[
     {icon:"🍃",name:"Tea Estates",detail:"Green hills & tea farms",dist:"Walking distance"},
     {icon:"🛒",name:"Mbale Town",detail:"Shopping & market",dist:"0.3 km"},
     {icon:"🚌",name:"Mbale Stage",detail:"Kisumu 1hr 30min",dist:"0.1 km"},
     {icon:"🏥",name:"Vihiga County Hospital",detail:"County hospital",dist:"3 km"},
   ]},

  // ── MIGORI COUNTY ──
  {id:40,title:"Migori Town Apartment",location:"Migori Town",county:"Migori",subcounty:"Suna East",
   type:"Apartment",price:15000,beds:2,baths:1,sqft:520,rating:3.9,reviews:6,
   badge:"Available",badgeClass:"badge-avail",isNew:true,
   available:true,pet:false,parking:true,furnished:false,pool:false,beachfront:false,borehole:false,solar:false,
   tags:["Affordable","Border town","Gold mines nearby","Growing"],
   highlight:"Kenya's gold country — vibrant border economy",
   desc:"Affordable apartment in Migori, a bustling border town adjacent to Tanzania. Active gold mining economy creates strong employment. Good for traders and civil servants.",
   img:KE_IMGS.apt4,modalImg:KE_IMGS.apt4.replace('w=600','w=900'),
   essentials:[
     {icon:"🛒",name:"Migori Market",detail:"Cross-border trade market",dist:"0.3 km"},
     {icon:"🚌",name:"Migori Stage",detail:"Kisumu 2hrs 30min",dist:"0.1 km"},
     {icon:"🏥",name:"Migori County Hospital",detail:"County referral",dist:"1 km"},
   ]},
];

/* ═══════════════════════════════════════════════
   COUNTY DATA
═══════════════════════════════════════════════ */
const counties = [
  {name:"Nairobi",count:9,tag:"Capital",img:"https://images.unsplash.com/photo-1611348586840-ea9872d33411?w=400&q=70&auto=format&fit=crop"},
  {name:"Mombasa",count:4,tag:"Coastal",img:"https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=70&auto=format&fit=crop"},
  {name:"Kisumu",count:3,tag:"Lake region",img:"https://images.unsplash.com/photo-1504205166486-5d3e16ce49c4?w=400&q=70&auto=format&fit=crop"},
  {name:"Nakuru",count:3,tag:"Rift Valley",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Kiambu",count:2,tag:"Metro",img:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=70&auto=format&fit=crop"},
  {name:"Uasin Gishu",count:2,tag:"Highlands",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Kwale",count:2,tag:"Coastal",img:"https://images.unsplash.com/photo-1589197331516-4d84b72ebde3?w=400&q=70&auto=format&fit=crop"},
  {name:"Kajiado",count:2,tag:"Greater Nairobi",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Machakos",count:2,tag:"Eastern",img:"https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=70&auto=format&fit=crop"},
  {name:"Meru",count:2,tag:"Mt Kenya",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Nyeri",count:1,tag:"Mt Kenya",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Embu",count:1,tag:"Eastern",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Lamu",count:1,tag:"Swahili Coast",img:"https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=70&auto=format&fit=crop"},
  {name:"Homa Bay",count:1,tag:"Lake region",img:"https://images.unsplash.com/photo-1504205166486-5d3e16ce49c4?w=400&q=70&auto=format&fit=crop"},
  {name:"Migori",count:1,tag:"South Nyanza",img:"https://images.unsplash.com/photo-1504205166486-5d3e16ce49c4?w=400&q=70&auto=format&fit=crop"},
  {name:"Trans-Nzoia",count:1,tag:"Mt Elgon",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Bungoma",count:1,tag:"Western",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Siaya",count:1,tag:"Lake region",img:"https://images.unsplash.com/photo-1504205166486-5d3e16ce49c4?w=400&q=70&auto=format&fit=crop"},
  {name:"Vihiga",count:1,tag:"Western",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Garissa",count:1,tag:"North Eastern",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Muranga",count:0,tag:"Central",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Kirinyaga",count:0,tag:"Mt Kenya",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Nyandarua",count:0,tag:"Central",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Laikipia",count:0,tag:"Laikipia Plateau",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Baringo",count:0,tag:"Rift Valley",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Elgeyo-Marakwet",count:0,tag:"Kerio Valley",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"West Pokot",count:0,tag:"Rift Valley",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Turkana",count:0,tag:"Northern",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Samburu",count:0,tag:"Northern",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Isiolo",count:0,tag:"Northern",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Marsabit",count:0,tag:"Chalbi",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Wajir",count:0,tag:"North Eastern",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Mandera",count:0,tag:"North Eastern",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Tana River",count:0,tag:"Coastal hinterland",img:"https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=70&auto=format&fit=crop"},
  {name:"Taita-Taveta",count:0,tag:"Tsavo",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Kitui",count:0,tag:"Eastern",img:"https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=70&auto=format&fit=crop"},
  {name:"Makueni",count:0,tag:"Eastern",img:"https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=70&auto=format&fit=crop"},
  {name:"Kakamega",count:0,tag:"Western",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Kisii",count:0,tag:"South Nyanza",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Nyamira",count:0,tag:"Highlands",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Kericho",count:0,tag:"Tea country",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Bomet",count:0,tag:"Rift Valley",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Narok",count:0,tag:"Mara",img:"https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=70&auto=format&fit=crop"},
  {name:"Busia",count:0,tag:"Western border",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Tharaka-Nithi",count:0,tag:"Eastern",img:"https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&q=70&auto=format&fit=crop"},
  {name:"Nandi",count:0,tag:"Rift Valley",img:"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70&auto=format&fit=crop"},
  {name:"Kilifi",count:0,tag:"Coastal",img:"https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&q=70&auto=format&fit=crop"},
];

/* ═══════════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════════ */
let activeFilter = 'all';
let savedIds = new Set();
let visibleCount = 12;
let currentFiltered = [];

/* ═══════════════════════════════════════════════
   BUILD COUNTY SCROLL
═══════════════════════════════════════════════ */
function buildCounties() {
  const el = document.getElementById('countyScroll');
  el.innerHTML = counties.map(c => `
    <div class="county-card" onclick="quickSearch('${c.name}')">
      <div class="county-tag">${c.tag}</div>
      <img class="county-img" src="${c.img}" alt="${c.name} Kenya" loading="lazy"/>
      <div class="county-info">
        <div class="county-name">${c.name}</div>
        <div class="county-count">${c.count > 0 ? c.count + ' listing' + (c.count>1?'s':'') : 'Coming soon'}</div>
      </div>
    </div>
  `).join('');
}

function scrollCounties(dir) {
  const el = document.getElementById('countyScroll');
  el.scrollBy({left: dir * 450, behavior: 'smooth'});
}

/* ═══════════════════════════════════════════════
   RENDER CARDS
═══════════════════════════════════════════════ */
function renderCard(l) {
  const isSaved = savedIds.has(l.id);
  return `<div class="card" onclick="openModal(${l.id})">
    <div class="card-img-wrap">
      <img class="card-img" src="${l.img}" alt="${l.title}" loading="lazy"/>
      <div class="card-badge ${l.badgeClass}">${l.badge}</div>
      <button class="card-fav ${isSaved ? 'saved' : ''}" id="fav${l.id}" onclick="toggleSave(event,${l.id})">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
      <div class="card-rating"><span class="star">★</span> ${l.rating.toFixed(1)} <span style="color:var(--ink-muted);font-size:11px">(${l.reviews})</span></div>
    </div>
    <div class="card-body">
      <div class="card-price">KSh ${l.price.toLocaleString()}<sub> / month</sub></div>
      <div class="card-title">${l.title}</div>
      <div class="card-loc">
        <svg class="loc-pin" viewBox="0 0 12 16"><path d="M6 0C3.2 0 1 2.2 1 5c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
        ${l.location} · ${l.county} County
      </div>
      <div class="card-specs">
        <div class="spec">
          <svg class="spec-icon" viewBox="0 0 16 16"><path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z"/></svg>
          ${l.beds} bed${l.beds>1?'s':''}
        </div>
        <div class="spec">
          <svg class="spec-icon" viewBox="0 0 16 16"><path d="M14 9H2V8h12v1zm-1 4H3l-1-5h13l-1 5zM1 7V3h2v1h1V3h1v1h1V3h1v1h1V3h1v1h1V3h1v1h1V3h2v4H1z"/></svg>
          ${l.baths} bath${l.baths>1?'s':''}
        </div>
        <div class="spec">
          <svg class="spec-icon" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
          ${l.sqft.toLocaleString()} sqft
        </div>
      </div>
      <div class="card-tags">
        ${l.tags.slice(0,3).map((t,i) => `<span class="tag ${i===0?'hi':''}">${t}</span>`).join('')}
        ${l.isNew ? '<span class="tag gold">✨ New</span>' : ''}
        ${l.beachfront ? '<span class="tag hi">🌊 Beach</span>' : ''}
      </div>
    </div>
  </div>`;
}

function filterListings() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;
  const maxP = parseInt(document.getElementById('priceFilter').value) || Infinity;
  const minB = parseInt(document.getElementById('bedsFilter').value) || 0;
  const sort = document.getElementById('sortSelect').value;

  let list = listings.filter(l => {
    if (q && !l.title.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)
        && !l.county.toLowerCase().includes(q) && !(l.subcounty||'').toLowerCase().includes(q)) return false;
    if (type && l.type !== type) return false;
    if (l.price > maxP) return false;
    if (l.beds < minB) return false;
    if (activeFilter === 'available' && !l.available) return false;
    if (activeFilter === 'pet' && !l.pet) return false;
    if (activeFilter === 'parking' && !l.parking) return false;
    if (activeFilter === 'furnished' && !l.furnished) return false;
    if (activeFilter === 'pool' && !l.pool) return false;
    if (activeFilter === 'new' && !l.isNew) return false;
    if (activeFilter === 'beachfront' && !l.beachfront) return false;
    if (activeFilter === 'borehole' && !l.borehole) return false;
    if (activeFilter === 'solar' && !l.solar) return false;
    return true;
  });

  if (sort === 'price_asc') list.sort((a,b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a,b) => b.price - a.price);
  else if (sort === 'size_desc') list.sort((a,b) => b.sqft - a.sqft);
  else if (sort === 'rating') list.sort((a,b) => b.rating - a.rating);

  currentFiltered = list;
  visibleCount = 12;
  document.getElementById('resultCount').textContent = list.length;

  const grid = document.getElementById('listingsGrid');
  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem 0;color:var(--ink-muted)">
      <div style="font-size:40px;margin-bottom:1rem">🔍</div>
      <div style="font-size:16px;font-weight:500">No properties found</div>
      <div style="font-size:13px;margin-top:6px">Try adjusting your filters or <a style="color:var(--sage);cursor:pointer" onclick="clearFilters()">clear all filters</a></div>
    </div>`;
    document.getElementById('loadMoreWrap').style.display = 'none';
  } else {
    grid.innerHTML = list.slice(0, visibleCount).map(renderCard).join('');
    document.getElementById('loadMoreWrap').style.display = list.length > visibleCount ? 'block' : 'none';
  }
}

function loadMore() {
  visibleCount += 8;
  document.getElementById('listingsGrid').innerHTML = currentFiltered.slice(0, visibleCount).map(renderCard).join('');
  document.getElementById('loadMoreWrap').style.display = currentFiltered.length > visibleCount ? 'block' : 'none';
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('typeFilter').value = '';
  document.getElementById('priceFilter').value = '';
  document.getElementById('bedsFilter').value = '0';
  setChip(document.querySelector('.chip[data-f="all"]'), 'all');
}

function setChip(el, val) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  activeFilter = val;
  filterListings();
}

function setChipByKey(key) {
  const chip = document.querySelector(`.chip[data-f="${key}"]`);
  if (chip) setChip(chip, key);
  document.getElementById('listings').scrollIntoView({behavior:'smooth'});
}

function quickSearch(term) {
  document.getElementById('searchInput').value = term;
  setChip(document.querySelector('.chip[data-f="all"]'), 'all');
  filterListings();
  document.getElementById('listings').scrollIntoView({behavior:'smooth'});
}

/* ═══════════════════════════════════════════════
   SAVE / FAVOURITES
═══════════════════════════════════════════════ */
function toggleSave(e, id) {
  e.stopPropagation();
  if (savedIds.has(id)) savedIds.delete(id);
  else savedIds.add(id);
  const el = document.getElementById('fav' + id);
  if (el) el.classList.toggle('saved', savedIds.has(id));
  document.getElementById('savedCount').textContent = savedIds.size;
  showToast(savedIds.has(id) ? '♥ Saved to favourites!' : 'Removed from saved');
}

/* ═══════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════ */
function openModal(id) {
  const l = listings.find(x => x.id === id);
  if (!l) return;
  document.getElementById('modalInner').innerHTML = `
    <div class="modal-img">
      <img src="${l.modalImg || l.img}" alt="${l.title}" loading="lazy"/>
    </div>
    <div class="modal-body">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="modal-price-row">
            <div class="m-price">KSh ${l.price.toLocaleString()}</div>
            <div class="m-period">/ month</div>
          </div>
          <div class="m-title">${l.title}</div>
        </div>
        <div class="m-rating">
          <div class="r-val">${l.rating.toFixed(1)} ★</div>
          <div class="r-ct">${l.reviews} reviews</div>
        </div>
      </div>
      <div class="m-loc">
        <svg style="width:13px;height:13px;fill:var(--sage);flex-shrink:0" viewBox="0 0 12 16"><path d="M6 0C3.2 0 1 2.2 1 5c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
        ${l.location} &nbsp;·&nbsp; ${l.subcounty||''} Sub-county &nbsp;·&nbsp; ${l.county} County
      </div>
      <div class="m-highlight">✦ ${l.highlight}</div>
      <div class="m-desc">${l.desc}</div>
      <div class="m-section">Property details</div>
      <div class="detail-grid">
        <div class="detail-box"><div class="db-label">Type</div><div class="db-val">${l.type}</div></div>
        <div class="detail-box"><div class="db-label">Bedrooms</div><div class="db-val">${l.beds}</div></div>
        <div class="detail-box"><div class="db-label">Bathrooms</div><div class="db-val">${l.baths}</div></div>
        <div class="detail-box"><div class="db-label">Size</div><div class="db-val">${l.sqft.toLocaleString()} sqft</div></div>
        <div class="detail-box"><div class="db-label">Monthly rent</div><div class="db-val" style="color:var(--sage)">KSh ${l.price.toLocaleString()}</div></div>
        <div class="detail-box"><div class="db-label">Status</div><div class="db-val" style="color:${l.available ? 'var(--sage)' : 'var(--terracotta)'}">${l.available ? '✓ Available' : 'Let agreed'}</div></div>
      </div>
      <div class="m-section">Features & amenities</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:1.5rem">
        ${l.tags.map(t => `<span class="tag hi">${t}</span>`).join('')}
        ${l.borehole ? '<span class="tag hi">💧 Borehole</span>' : ''}
        ${l.solar ? '<span class="tag gold">☀️ Solar</span>' : ''}
        ${l.beachfront ? '<span class="tag hi">🌊 Beachfront</span>' : ''}
      </div>
      ${l.essentials && l.essentials.length ? `
      <div class="m-section">Nearby essentials</div>
      <div class="essentials">
        ${l.essentials.map(e => `
          <div class="essential">
            <div class="e-icon">${e.icon}</div>
            <div>
              <div class="e-name">${e.name}</div>
              <div class="e-detail">${e.detail}</div>
            </div>
            <div class="e-dist">${e.dist}</div>
          </div>
        `).join('')}
      </div>` : ''}
      <div class="modal-actions">
        <button class="btn-m-primary" onclick="contactAgent(${l.id})">Contact agent →</button>
        <button class="btn-m-sec" onclick="toggleSave(event,${l.id});this.textContent=savedIds.has(${l.id})?'♥ Saved':'♡ Save'">
          ${savedIds.has(l.id) ? '♥ Saved' : '♡ Save'}
        </button>
        <button class="btn-m-sec" onclick="shareProperty(${l.id})">🔗 Share</button>
      </div>
    </div>`;
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}
function handleModalClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function contactAgent(id) {
  const l = listings.find(x => x.id === id);
  closeModal();
  showToast('Opening chat with agent…');
  setTimeout(() => {
    if (typeof sendPrompt === 'function') {
      sendPrompt(`I am interested in "${l.title}" in ${l.location}, ${l.county} County at KSh ${l.price.toLocaleString()}/month. Help me draft a professional message to the landlord and list the top 10 questions I should ask before signing a lease.`);
    }
  }, 400);
}

function shareProperty(id) {
  const l = listings.find(x => x.id === id);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`https://nestify.co.ke/p/${l.id}`).catch(()=>{});
  }
  showToast(`🔗 Link copied: nestify.co.ke/p/${l.id}`);
}

/* ═══════════════════════════════════════════════
   CALCULATOR
═══════════════════════════════════════════════ */
function updateCalc() {
  const val = parseInt(document.getElementById('loanVal').value);
  const down = parseInt(document.getElementById('downPay').value);
  const rate = parseFloat(document.getElementById('rateSlider').value);
  const term = parseInt(document.getElementById('termSlider').value);

  document.getElementById('loanValDisplay').textContent = 'KSh ' + val.toLocaleString();
  document.getElementById('downPayDisplay').textContent = down + '%';
  document.getElementById('rateDisplay').textContent = rate + '%';
  document.getElementById('termDisplay').textContent = term + ' yr' + (term > 1 ? 's' : '');

  const downAmt = val * down / 100;
  const principal = val - downAmt;
  const mr = rate / 100 / 12;
  const n = term * 12;
  const monthly = principal * (mr * Math.pow(1+mr,n)) / (Math.pow(1+mr,n) - 1);
  const totalPay = monthly * n;
  const totalInt = totalPay - principal;
  const pctP = Math.round(principal / totalPay * 100);

  document.getElementById('monthlyPayment').textContent = 'KSh ' + Math.round(monthly).toLocaleString();
  document.getElementById('loanAmount').textContent = 'KSh ' + (principal/1e6).toFixed(1) + 'M';
  document.getElementById('downPayAmt').textContent = 'KSh ' + (downAmt/1e6).toFixed(1) + 'M';
  document.getElementById('totalInterest').textContent = 'KSh ' + (totalInt/1e6).toFixed(1) + 'M';
  document.getElementById('totalCost').textContent = 'KSh ' + (totalPay/1e6).toFixed(1) + 'M';
  document.getElementById('calcBarFill').style.width = pctP + '%';
  document.getElementById('principalPct').textContent = pctP + '%';
  document.getElementById('interestPct').textContent = (100-pctP) + '%';
}

/* ═══════════════════════════════════════════════
   MOBILE NAV
═══════════════════════════════════════════════ */
function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
  document.body.style.overflow = document.getElementById('mobileNav').classList.contains('open') ? 'hidden' : '';
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ═══════════════════════════════════════════════
   COUNT-UP
═══════════════════════════════════════════════ */
function countUp(elId, target, suffix='') {
  const el = document.getElementById(elId);
  if (!el) return;
  let count = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    count = Math.min(count + step, target);
    el.textContent = count.toLocaleString() + suffix;
    if (count >= target) clearInterval(timer);
  }, 20);
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
buildCounties();
filterListings();
updateCalc();
setTimeout(() => {
  countUp('cu1', 4200, '+');
  countUp('cu2', 47, '');
  countUp('cu3', 12000, '+');
}, 600);