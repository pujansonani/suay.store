/**
 * Fictional demonstration data.
 *
 * Every clinic, practitioner, credential and review below is invented for the
 * purposes of this demo. None of them refer to a real business or a real
 * person, and no medical licence recorded here is genuine. Reviews are flagged
 * `isSample` so the interface can say so on the page.
 */

export const CATEGORIES = [
  { slug: "skin-dermatology", name: "Skin & Dermatology", nameTh: "ผิวหนังและโรคผิวหนัง", nameJa: "皮膚科", description: "Consultations, acne care, pigmentation and general skin health." },
  { slug: "injectables", name: "Injectables & Aesthetics", nameTh: "ฉีดและความงาม", nameJa: "注入・美容", description: "Non-surgical aesthetic treatments delivered by trained practitioners." },
  { slug: "laser-light", name: "Laser & Light", nameTh: "เลเซอร์และแสง", nameJa: "レーザー・光治療", description: "Laser hair removal, resurfacing and light-based skin treatments." },
  { slug: "body-contouring", name: "Body & Contouring", nameTh: "รูปร่างและกระชับสัดส่วน", nameJa: "ボディ・輪郭", description: "Non-invasive body treatments and post-treatment care." },
  { slug: "dental-aesthetics", name: "Dental Aesthetics", nameTh: "ทันตกรรมความงาม", nameJa: "審美歯科", description: "Whitening, cleaning and cosmetic dental consultations." },
  { slug: "wellness-iv", name: "Wellness & IV Therapy", nameTh: "สุขภาพและวิตามินทางหลอดเลือด", nameJa: "ウェルネス・点滴", description: "Vitamin therapy, health screening and preventative wellness." },
  { slug: "hair-scalp", name: "Hair & Scalp", nameTh: "เส้นผมและหนังศีรษะ", nameJa: "毛髪・頭皮", description: "Scalp assessment, hair loss consultation and treatment programmes." },
  { slug: "physio-recovery", name: "Physiotherapy & Recovery", nameTh: "กายภาพบำบัดและฟื้นฟู", nameJa: "理学療法・リカバリー", description: "Manual therapy, sports recovery and rehabilitation." },
];

export interface SeedService {
  slug: string;
  name: string;
  category: string;
  description: string;
  importantInfo?: string;
  durationMinutes: number;
  bufferAfterMinutes?: number;
  priceMinor: number;
  serviceClass: "WELLNESS" | "AESTHETIC" | "MEDICAL_AESTHETIC" | "MEDICAL";
  isMedicalAesthetic?: boolean;
  requires?: { type: "ROOM" | "EQUIPMENT"; tag?: string; quantity?: number }[];
}

export interface SeedStaff {
  name: string;
  role: string;
  bio: string;
  credentials: string[];
  qualifications: string[];
  specializations: string[];
  languages: string[];
  yearsExperience: number;
  /** Only true where the demo narrative includes an admin having checked. */
  verified: boolean;
  services: string[];
}

export interface SeedResource {
  name: string;
  type: "ROOM" | "EQUIPMENT";
  tag: string;
}

export interface SeedProvider {
  slug: string;
  name: string;
  legalName: string;
  specialty: string;
  tagline: string;
  description: string;
  district: string;
  city: string;
  addressLine1: string;
  postalCode: string;
  phone: string;
  email: string;
  status: "APPROVED" | "PENDING_REVIEW" | "SUSPENDED" | "CHANGES_REQUESTED";
  published: boolean;
  cover: number;
  cancellationPolicy: string;
  bookingPolicy: string;
  cancellationWindowHours: number;
  /** [dayOfWeek, "HH:MM", "HH:MM"] — split shifts are separate entries. */
  hours: [number, string, string][];
  services: SeedService[];
  staff: SeedStaff[];
  resources: SeedResource[];
}

const STANDARD_CANCELLATION =
  "Free cancellation up to 24 hours before your appointment. Within 24 hours, 50% of the treatment price is retained. Missed appointments are charged in full.";

const STANDARD_BOOKING =
  "Please arrive 10 minutes early for check-in. A short consultation is included before every treatment, and the practitioner may recommend a different treatment or decline to proceed if it is not suitable for you.";

export const PROVIDERS: SeedProvider[] = [
  {
    slug: "aster-medical-clinic",
    name: "Aster Medical Clinic",
    legalName: "Aster Medical Clinic Co., Ltd. (demo)",
    specialty: "Skin & Aesthetic Care",
    tagline: "Dermatology-led skin care in the heart of Sukhumvit.",
    description:
      "Aster Medical Clinic is a dermatology-led practice focused on evidence-based skin care. Every treatment begins with a consultation so that the plan matches your skin, not a package. Our treatment rooms are single-occupancy and our laser devices are serviced quarterly.",
    district: "Sukhumvit",
    city: "Bangkok",
    addressLine1: "188/4 Sukhumvit Soi 24, Khlong Tan",
    postalCode: "10110",
    phone: "+66 2 000 1101",
    email: "hello@aster.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 1,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [
      [1, "10:00", "20:00"], [2, "10:00", "20:00"], [3, "10:00", "20:00"],
      [4, "10:00", "20:00"], [5, "10:00", "21:00"], [6, "10:00", "18:00"],
    ],
    services: [
      { slug: "skin-consultation", name: "Dermatology Consultation", category: "skin-dermatology", description: "A 30-minute consultation with a dermatologist covering skin assessment, history and a written treatment plan. No treatment is performed during this appointment.", durationMinutes: 30, priceMinor: 100000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "hydrafacial", name: "Deep Cleansing Facial", category: "skin-dermatology", description: "Cleansing, gentle extraction and hydration, finished with SPF. Suitable for most skin types.", importantInfo: "Avoid retinoids for 3 days beforehand. Not suitable within 2 weeks of a chemical peel.", durationMinutes: 60, priceMinor: 250000, serviceClass: "AESTHETIC", requires: [{ type: "ROOM", tag: "treatment" }] },
      { slug: "laser-hair-removal-underarm", name: "Laser Hair Removal — Underarm", category: "laser-light", description: "Diode laser hair reduction for the underarm area. A course of 6 sessions is typical; results vary between individuals.", importantInfo: "Shave the area 24 hours before. Avoid sun exposure and self-tanning for 2 weeks before and after.", durationMinutes: 30, bufferAfterMinutes: 15, priceMinor: 180000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "laser" }, { type: "EQUIPMENT", tag: "laser-diode" }] },
      { slug: "pigmentation-laser", name: "Pigmentation Laser Treatment", category: "laser-light", description: "Q-switched laser treatment for sun spots and uneven pigmentation, following a dermatologist assessment.", importantInfo: "Requires a prior consultation. Not suitable during pregnancy or while taking photosensitising medication.", durationMinutes: 45, bufferAfterMinutes: 15, priceMinor: 450000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "laser" }, { type: "EQUIPMENT", tag: "laser-qs" }] },
      { slug: "acne-programme", name: "Acne Treatment Programme — Session", category: "skin-dermatology", description: "A single session within a supervised acne programme: extraction, medicated application and review of your home routine.", durationMinutes: 45, priceMinor: 190000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "treatment" }] },
    ],
    staff: [
      { name: "Dr. Napat Siriwan", role: "Dermatologist", bio: "Leads the clinic's medical team and oversees all laser protocols.", credentials: ["Sample credential — Board certification (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Acne", "Pigmentation", "Laser dermatology"], languages: ["Thai", "English"], yearsExperience: 12, verified: true, services: ["skin-consultation", "pigmentation-laser", "acne-programme", "laser-hair-removal-underarm"] },
      { name: "Dr. Pimchanok Areeya", role: "Dermatologist", bio: "Focuses on sensitive skin and post-treatment care.", credentials: ["Sample credential — Board certification (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Sensitive skin", "Rosacea"], languages: ["Thai", "English", "Japanese"], yearsExperience: 8, verified: true, services: ["skin-consultation", "acne-programme", "hydrafacial"] },
      { name: "Kanya Thongchai", role: "Senior Aesthetician", bio: "Facial treatments and pre-laser skin preparation.", credentials: ["Sample credential — Aesthetics certification (demo data)"], qualifications: ["Diploma in Aesthetics (fictional sample record)"], specializations: ["Facials", "Skin preparation"], languages: ["Thai", "English"], yearsExperience: 6, verified: true, services: ["hydrafacial", "laser-hair-removal-underarm"] },
    ],
    resources: [
      { name: "Consultation Room 1", type: "ROOM", tag: "consult" },
      { name: "Treatment Room 2", type: "ROOM", tag: "treatment" },
      { name: "Treatment Room 3", type: "ROOM", tag: "treatment" },
      { name: "Laser Suite", type: "ROOM", tag: "laser" },
      { name: "Diode Laser Unit A", type: "EQUIPMENT", tag: "laser-diode" },
      { name: "Q-Switched Laser Unit", type: "EQUIPMENT", tag: "laser-qs" },
    ],
  },
  {
    slug: "nara-aesthetic-centre",
    name: "Nara Aesthetic Centre",
    legalName: "Nara Aesthetic Centre Co., Ltd. (demo)",
    specialty: "Aesthetic Medicine",
    tagline: "Considered aesthetic treatment, with time to think it over.",
    description:
      "Nara Aesthetic Centre offers non-surgical aesthetic treatments in a quiet clinic setting in Thong Lo. We include a full consultation with every first appointment and we will tell you when a treatment is not right for you.",
    district: "Thong Lo",
    city: "Bangkok",
    addressLine1: "55 Sukhumvit Soi 55, Khlong Tan Nuea",
    postalCode: "10110",
    phone: "+66 2 000 1102",
    email: "hello@nara.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 2,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [
      [1, "11:00", "20:00"], [2, "11:00", "20:00"], [3, "11:00", "20:00"],
      [4, "11:00", "20:00"], [5, "11:00", "20:00"], [6, "10:00", "19:00"], [0, "12:00", "18:00"],
    ],
    services: [
      { slug: "aesthetic-consultation", name: "Aesthetic Consultation", category: "injectables", description: "A 30-minute consultation to discuss your goals, review suitability and set out realistic expectations and costs. No treatment on the day.", durationMinutes: 30, priceMinor: 80000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "skin-booster", name: "Skin Booster Treatment", category: "injectables", description: "Micro-injections of hydrating solution across the treatment area, performed by a doctor.", importantInfo: "Requires a consultation first. Not suitable during pregnancy or breastfeeding, or with an active skin infection.", durationMinutes: 45, bufferAfterMinutes: 15, priceMinor: 850000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "procedure" }] },
      { slug: "chemical-peel", name: "Medical Chemical Peel", category: "skin-dermatology", description: "A superficial peel to improve texture and tone, selected to suit your skin at consultation.", importantInfo: "Expect 3–5 days of light flaking. Avoid sun exposure for two weeks afterwards.", durationMinutes: 45, priceMinor: 350000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "treatment" }] },
      { slug: "signature-facial", name: "Signature Facial", category: "skin-dermatology", description: "A 75-minute facial including cleansing, mask and massage. Non-medical.", durationMinutes: 75, priceMinor: 320000, serviceClass: "AESTHETIC", requires: [{ type: "ROOM", tag: "treatment" }] },
    ],
    staff: [
      { name: "Dr. Arisa Wongsakul", role: "Aesthetic Physician", bio: "Leads the injectable programme and all first consultations.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Injectables", "Skin boosters"], languages: ["Thai", "English"], yearsExperience: 10, verified: true, services: ["aesthetic-consultation", "skin-booster", "chemical-peel"] },
      { name: "Dr. Thanawat Prasert", role: "Aesthetic Physician", bio: "Peels, skin health and treatment planning.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Peels", "Skin health"], languages: ["Thai", "English"], yearsExperience: 7, verified: true, services: ["aesthetic-consultation", "chemical-peel"] },
      { name: "Malee Chaiyaphum", role: "Aesthetician", bio: "Facials and aftercare.", credentials: ["Sample credential — Aesthetics certification (demo data)"], qualifications: ["Diploma in Aesthetics (fictional sample record)"], specializations: ["Facials"], languages: ["Thai"], yearsExperience: 5, verified: true, services: ["signature-facial"] },
    ],
    resources: [
      { name: "Consultation Room", type: "ROOM", tag: "consult" },
      { name: "Procedure Room 1", type: "ROOM", tag: "procedure" },
      { name: "Treatment Room 1", type: "ROOM", tag: "treatment" },
      { name: "Treatment Room 2", type: "ROOM", tag: "treatment" },
    ],
  },
  {
    slug: "verde-wellness-clinic",
    name: "Verde Wellness Clinic",
    legalName: "Verde Wellness Co., Ltd. (demo)",
    specialty: "Preventative Wellness",
    tagline: "Health screening and vitamin therapy, without the hard sell.",
    description:
      "Verde Wellness Clinic provides preventative health services: screening, nutrition review and intravenous vitamin therapy under medical supervision. We publish our prices in full and we do not sell treatment packages at the first visit.",
    district: "Ari",
    city: "Bangkok",
    addressLine1: "12 Phahonyothin Soi 7, Samsen Nai",
    postalCode: "10400",
    phone: "+66 2 000 1103",
    email: "hello@verde.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 3,
    cancellationPolicy: "Free cancellation up to 12 hours before your appointment. Later cancellations are charged at 30% of the treatment price.",
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 12,
    hours: [[1, "09:00", "18:00"], [2, "09:00", "18:00"], [3, "09:00", "18:00"], [4, "09:00", "18:00"], [5, "09:00", "18:00"], [6, "09:00", "14:00"]],
    services: [
      { slug: "health-screening", name: "Preventative Health Screening", category: "wellness-iv", description: "A structured screening appointment including history, measurements and a written summary. Laboratory tests are quoted separately.", durationMinutes: 60, priceMinor: 350000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "iv-vitamin", name: "IV Vitamin Therapy", category: "wellness-iv", description: "Intravenous vitamin infusion administered by a nurse under medical supervision.", importantInfo: "A short medical screening is required before your first infusion. Not suitable with kidney disease or during pregnancy without specialist advice.", durationMinutes: 60, priceMinor: 280000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "infusion" }, { type: "EQUIPMENT", tag: "infusion-chair" }] },
      { slug: "nutrition-review", name: "Nutrition Review", category: "wellness-iv", description: "A 45-minute appointment with a dietitian covering diet, habits and a practical plan.", durationMinutes: 45, priceMinor: 150000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "consult" }] },
    ],
    staff: [
      { name: "Dr. Siriporn Kaewkla", role: "General Practitioner", bio: "Oversees screening and infusion protocols.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Preventative medicine"], languages: ["Thai", "English"], yearsExperience: 14, verified: true, services: ["health-screening", "iv-vitamin"] },
      { name: "Ploy Wattana", role: "Registered Nurse", bio: "Administers infusions and pre-treatment checks.", credentials: ["Sample credential — Nursing registration (demo data)"], qualifications: ["BSc Nursing (fictional sample record)"], specializations: ["IV therapy"], languages: ["Thai", "English"], yearsExperience: 9, verified: true, services: ["iv-vitamin"] },
      { name: "Fah Rattanakosin", role: "Dietitian", bio: "Nutrition planning and follow-up.", credentials: ["Sample credential — Dietetics registration (demo data)"], qualifications: ["MSc Nutrition (fictional sample record)"], specializations: ["Nutrition"], languages: ["Thai", "English"], yearsExperience: 6, verified: true, services: ["nutrition-review"] },
    ],
    resources: [
      { name: "Consultation Room A", type: "ROOM", tag: "consult" },
      { name: "Infusion Lounge", type: "ROOM", tag: "infusion" },
      { name: "Infusion Chair 1", type: "EQUIPMENT", tag: "infusion-chair" },
      { name: "Infusion Chair 2", type: "EQUIPMENT", tag: "infusion-chair" },
    ],
  },
  {
    slug: "siam-skin-institute",
    name: "Siam Skin Institute",
    legalName: "Siam Skin Institute Co., Ltd. (demo)",
    specialty: "Clinical Dermatology",
    tagline: "A referral-style dermatology practice in central Bangkok.",
    description:
      "Siam Skin Institute treats medical skin conditions alongside aesthetic concerns. Appointments are longer than average because we would rather diagnose properly than treat quickly.",
    district: "Siam",
    city: "Bangkok",
    addressLine1: "999 Rama I Road, Pathum Wan",
    postalCode: "10330",
    phone: "+66 2 000 1104",
    email: "hello@siamskin.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 4,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "09:00", "17:00"], [2, "09:00", "17:00"], [3, "09:00", "17:00"], [4, "09:00", "17:00"], [5, "09:00", "17:00"]],
    services: [
      { slug: "skin-check", name: "Full Skin Check", category: "skin-dermatology", description: "A systematic examination of the skin, with photography of anything requiring follow-up.", durationMinutes: 45, priceMinor: 220000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "eczema-review", name: "Eczema & Dermatitis Review", category: "skin-dermatology", description: "Assessment and management plan for eczema and contact dermatitis.", durationMinutes: 30, priceMinor: 150000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "fractional-laser", name: "Fractional Laser Resurfacing", category: "laser-light", description: "Fractional laser treatment for texture and scarring, performed by a dermatologist.", importantInfo: "Downtime of 3–7 days is expected. A consultation is required before booking this treatment.", durationMinutes: 60, bufferAfterMinutes: 20, priceMinor: 750000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "laser" }, { type: "EQUIPMENT", tag: "laser-fractional" }] },
      { slug: "mole-review", name: "Mole Assessment", category: "skin-dermatology", description: "Dermoscopic assessment of a specific lesion, with photographic record.", durationMinutes: 30, priceMinor: 180000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
    ],
    staff: [
      { name: "Dr. Chalermchai Boonmee", role: "Consultant Dermatologist", bio: "Medical dermatology and skin cancer surveillance.", credentials: ["Sample credential — Board certification (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Medical dermatology", "Dermoscopy"], languages: ["Thai", "English"], yearsExperience: 18, verified: true, services: ["skin-check", "eczema-review", "mole-review", "fractional-laser"] },
      { name: "Dr. Nutcha Limpanich", role: "Dermatologist", bio: "Paediatric and adult eczema care.", credentials: ["Sample credential — Board certification (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Eczema", "Paediatric dermatology"], languages: ["Thai", "English"], yearsExperience: 9, verified: true, services: ["skin-check", "eczema-review", "mole-review"] },
    ],
    resources: [
      { name: "Clinic Room 1", type: "ROOM", tag: "consult" },
      { name: "Clinic Room 2", type: "ROOM", tag: "consult" },
      { name: "Laser Room", type: "ROOM", tag: "laser" },
      { name: "Fractional Laser Unit", type: "EQUIPMENT", tag: "laser-fractional" },
    ],
  },
  {
    slug: "aurora-aesthetic-clinic",
    name: "Aurora Aesthetic Clinic",
    legalName: "Aurora Aesthetic Co., Ltd. (demo)",
    specialty: "Body & Skin",
    tagline: "Body treatments and skin health on Sukhumvit.",
    description:
      "Aurora Aesthetic Clinic combines non-invasive body treatments with skin care. Each programme begins with measurements and a realistic discussion of what the treatment can and cannot achieve.",
    district: "Phrom Phong",
    city: "Bangkok",
    addressLine1: "42 Sukhumvit Soi 39, Khlong Tan Nuea",
    postalCode: "10110",
    phone: "+66 2 000 1105",
    email: "hello@aurora.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 5,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "10:00", "14:00"], [1, "16:00", "21:00"], [2, "10:00", "14:00"], [2, "16:00", "21:00"], [3, "10:00", "21:00"], [4, "10:00", "21:00"], [5, "10:00", "21:00"], [6, "10:00", "18:00"]],
    services: [
      { slug: "body-contour-session", name: "Non-Invasive Body Contouring — Session", category: "body-contouring", description: "A single session of non-invasive body contouring on one area, following an assessment.", importantInfo: "Results vary considerably between individuals. This treatment is not a weight-loss method.", durationMinutes: 60, bufferAfterMinutes: 15, priceMinor: 650000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "body" }, { type: "EQUIPMENT", tag: "contour-device" }] },
      { slug: "lymphatic-massage", name: "Post-Treatment Lymphatic Massage", category: "body-contouring", description: "Manual lymphatic drainage, often booked after a body treatment.", durationMinutes: 60, priceMinor: 180000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "treatment" }] },
      { slug: "back-facial", name: "Back Treatment", category: "skin-dermatology", description: "Cleansing and extraction for the back and shoulders.", durationMinutes: 60, priceMinor: 220000, serviceClass: "AESTHETIC", requires: [{ type: "ROOM", tag: "treatment" }] },
      { slug: "body-consultation", name: "Body Treatment Consultation", category: "body-contouring", description: "Assessment, measurements and a written plan. No treatment on the day.", durationMinutes: 30, priceMinor: 0, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "consult" }] },
    ],
    staff: [
      { name: "Dr. Kittipong Sae-Lim", role: "Aesthetic Physician", bio: "Oversees body treatment protocols and assessments.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Body contouring"], languages: ["Thai", "English"], yearsExperience: 11, verified: true, services: ["body-contour-session", "body-consultation"] },
      { name: "Wanida Suksan", role: "Therapist", bio: "Manual lymphatic drainage and post-treatment care.", credentials: ["Sample credential — Massage therapy certification (demo data)"], qualifications: ["Certificate in Manual Lymphatic Drainage (fictional sample record)"], specializations: ["Lymphatic drainage"], languages: ["Thai", "English"], yearsExperience: 8, verified: true, services: ["lymphatic-massage", "back-facial"] },
      { name: "Ratree Chomdao", role: "Aesthetician", bio: "Skin treatments and preparation.", credentials: ["Sample credential — Aesthetics certification (demo data)"], qualifications: ["Diploma in Aesthetics (fictional sample record)"], specializations: ["Body skin care"], languages: ["Thai"], yearsExperience: 4, verified: true, services: ["back-facial", "lymphatic-massage"] },
    ],
    resources: [
      { name: "Consultation Room", type: "ROOM", tag: "consult" },
      { name: "Body Suite", type: "ROOM", tag: "body" },
      { name: "Treatment Room 1", type: "ROOM", tag: "treatment" },
      { name: "Contouring Device", type: "EQUIPMENT", tag: "contour-device" },
    ],
  },
  {
    slug: "baan-rak-dermatology",
    name: "Baan Rak Dermatology",
    legalName: "Baan Rak Dermatology Co., Ltd. (demo)",
    specialty: "Family Dermatology",
    tagline: "Straightforward skin care for the whole family.",
    description:
      "A family-oriented dermatology practice in Sathorn treating common skin conditions for adults and children, with same-week appointments where possible.",
    district: "Sathorn",
    city: "Bangkok",
    addressLine1: "77 South Sathorn Road, Thung Maha Mek",
    postalCode: "10120",
    phone: "+66 2 000 1106",
    email: "hello@baanrak.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 6,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "08:30", "17:00"], [2, "08:30", "17:00"], [3, "08:30", "17:00"], [4, "08:30", "17:00"], [5, "08:30", "17:00"], [6, "09:00", "13:00"]],
    services: [
      { slug: "family-skin-consult", name: "Skin Consultation", category: "skin-dermatology", description: "General dermatology consultation for adults and children.", durationMinutes: 30, priceMinor: 90000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "wart-removal", name: "Wart & Skin Tag Removal", category: "skin-dermatology", description: "Removal of small benign lesions, following assessment.", importantInfo: "Assessment is required first. Some lesions are referred rather than treated here.", durationMinutes: 30, priceMinor: 200000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "procedure" }] },
      { slug: "paediatric-eczema", name: "Paediatric Eczema Appointment", category: "skin-dermatology", description: "Longer appointment for children with eczema, including a caregiver plan.", durationMinutes: 45, priceMinor: 160000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
    ],
    staff: [
      { name: "Dr. Suchart Nimman", role: "Dermatologist", bio: "General and paediatric dermatology.", credentials: ["Sample credential — Board certification (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["General dermatology", "Paediatrics"], languages: ["Thai", "English"], yearsExperience: 16, verified: true, services: ["family-skin-consult", "wart-removal", "paediatric-eczema"] },
      { name: "Dr. Manee Kritsana", role: "Dermatologist", bio: "Minor procedures and adult skin conditions.", credentials: ["Sample credential — Board certification (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Minor procedures"], languages: ["Thai"], yearsExperience: 7, verified: true, services: ["family-skin-consult", "wart-removal"] },
    ],
    resources: [
      { name: "Room 1", type: "ROOM", tag: "consult" },
      { name: "Room 2", type: "ROOM", tag: "consult" },
      { name: "Procedure Room", type: "ROOM", tag: "procedure" },
    ],
  },
  {
    slug: "lumen-laser-clinic",
    name: "Lumen Laser Clinic",
    legalName: "Lumen Laser Co., Ltd. (demo)",
    specialty: "Laser Hair Removal",
    tagline: "One thing, done carefully.",
    description:
      "Lumen Laser Clinic focuses on laser hair reduction. We publish a full price list by area, we patch-test every new client, and we will tell you when your hair or skin type is unlikely to respond well.",
    district: "Phrom Phong",
    city: "Bangkok",
    addressLine1: "8 Sukhumvit Soi 31, Khlong Toei Nuea",
    postalCode: "10110",
    phone: "+66 2 000 1107",
    email: "hello@lumen.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 1,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "11:00", "20:00"], [2, "11:00", "20:00"], [3, "11:00", "20:00"], [4, "11:00", "20:00"], [5, "11:00", "20:00"], [6, "10:00", "18:00"], [0, "10:00", "18:00"]],
    services: [
      { slug: "patch-test", name: "Laser Patch Test & Consultation", category: "laser-light", description: "Required before your first laser session: skin assessment and a small test area.", durationMinutes: 30, priceMinor: 0, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "laser" }, { type: "EQUIPMENT", tag: "laser-diode" }] },
      { slug: "lhr-legs", name: "Laser Hair Removal — Full Legs", category: "laser-light", description: "Diode laser hair reduction, full legs. A course of sessions is required; results vary.", importantInfo: "Shave 24 hours before. Avoid sun exposure for two weeks before and after.", durationMinutes: 75, bufferAfterMinutes: 15, priceMinor: 550000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "laser" }, { type: "EQUIPMENT", tag: "laser-diode" }] },
      { slug: "lhr-face", name: "Laser Hair Removal — Face", category: "laser-light", description: "Diode laser hair reduction for facial areas.", importantInfo: "Not performed over active acne or broken skin.", durationMinutes: 30, bufferAfterMinutes: 15, priceMinor: 220000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "laser" }, { type: "EQUIPMENT", tag: "laser-diode" }] },
    ],
    staff: [
      { name: "Dr. Ornanong Petch", role: "Medical Director", bio: "Supervises all laser protocols and patch tests.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Laser safety"], languages: ["Thai", "English"], yearsExperience: 13, verified: true, services: ["patch-test", "lhr-legs", "lhr-face"] },
      { name: "Jiraporn Meesap", role: "Laser Technician", bio: "Certified laser operator.", credentials: ["Sample credential — Laser operator certification (demo data)"], qualifications: ["Certificate in Laser Operation (fictional sample record)"], specializations: ["Hair reduction"], languages: ["Thai", "English"], yearsExperience: 5, verified: true, services: ["lhr-legs", "lhr-face"] },
    ],
    resources: [
      { name: "Laser Room 1", type: "ROOM", tag: "laser" },
      { name: "Laser Room 2", type: "ROOM", tag: "laser" },
      { name: "Diode Laser 1", type: "EQUIPMENT", tag: "laser-diode" },
      { name: "Diode Laser 2", type: "EQUIPMENT", tag: "laser-diode" },
    ],
  },
  {
    slug: "chiang-mai-wellness-house",
    name: "Chiang Mai Wellness House",
    legalName: "Wellness House Chiang Mai Co., Ltd. (demo)",
    specialty: "Wellness & Recovery",
    tagline: "Recovery, physiotherapy and preventative care in Nimman.",
    description:
      "A wellness practice in Nimman offering physiotherapy, recovery services and health reviews. Sessions are one-to-one and we do not sell block packages before an assessment.",
    district: "Nimman",
    city: "Chiang Mai",
    addressLine1: "14 Nimmanhaemin Road, Suthep",
    postalCode: "50200",
    phone: "+66 53 000 1108",
    email: "hello@cmwellness.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 2,
    cancellationPolicy: "Free cancellation up to 24 hours before. Later cancellations are charged at 50%.",
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "08:00", "18:00"], [2, "08:00", "18:00"], [3, "08:00", "18:00"], [4, "08:00", "18:00"], [5, "08:00", "18:00"], [6, "09:00", "15:00"]],
    services: [
      { slug: "physio-assessment", name: "Physiotherapy Assessment", category: "physio-recovery", description: "A 60-minute initial assessment with a treatment plan.", durationMinutes: 60, priceMinor: 180000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "physio" }] },
      { slug: "physio-followup", name: "Physiotherapy Session", category: "physio-recovery", description: "Follow-up treatment session including manual therapy and exercise review.", durationMinutes: 45, priceMinor: 140000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "physio" }] },
      { slug: "sports-recovery", name: "Sports Recovery Session", category: "physio-recovery", description: "Recovery-focused session for athletes, including mobility work.", durationMinutes: 60, priceMinor: 160000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "physio" }] },
      { slug: "wellness-review", name: "Wellness Review", category: "wellness-iv", description: "A general health and lifestyle review with written recommendations.", durationMinutes: 45, priceMinor: 120000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "consult" }] },
    ],
    staff: [
      { name: "Nattapong Inthanon", role: "Physiotherapist", bio: "Musculoskeletal physiotherapy and rehabilitation.", credentials: ["Sample credential — Physiotherapy registration (demo data)"], qualifications: ["BSc Physiotherapy (fictional sample record)"], specializations: ["Musculoskeletal", "Rehabilitation"], languages: ["Thai", "English"], yearsExperience: 10, verified: true, services: ["physio-assessment", "physio-followup", "sports-recovery"] },
      { name: "Duangjai Saengthong", role: "Physiotherapist", bio: "Sports injury and recovery.", credentials: ["Sample credential — Physiotherapy registration (demo data)"], qualifications: ["BSc Physiotherapy (fictional sample record)"], specializations: ["Sports injury"], languages: ["Thai", "English"], yearsExperience: 6, verified: true, services: ["physio-followup", "sports-recovery", "wellness-review"] },
    ],
    resources: [
      { name: "Physio Room 1", type: "ROOM", tag: "physio" },
      { name: "Physio Room 2", type: "ROOM", tag: "physio" },
      { name: "Consultation Room", type: "ROOM", tag: "consult" },
    ],
  },
  {
    slug: "kanda-dental-aesthetics",
    name: "Kanda Dental Aesthetics",
    legalName: "Kanda Dental Co., Ltd. (demo)",
    specialty: "Cosmetic Dentistry",
    tagline: "Dental hygiene and cosmetic dentistry in Silom.",
    description:
      "Kanda Dental Aesthetics provides hygiene appointments, whitening and cosmetic consultations. Every cosmetic plan starts with an examination and a written estimate.",
    district: "Silom",
    city: "Bangkok",
    addressLine1: "301 Silom Road, Bang Rak",
    postalCode: "10500",
    phone: "+66 2 000 1109",
    email: "hello@kanda.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 3,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "09:00", "19:00"], [2, "09:00", "19:00"], [3, "09:00", "19:00"], [4, "09:00", "19:00"], [5, "09:00", "19:00"], [6, "09:00", "16:00"]],
    services: [
      { slug: "dental-hygiene", name: "Dental Hygiene Appointment", category: "dental-aesthetics", description: "Scale and polish with a hygienist, including a gum health check.", durationMinutes: 45, priceMinor: 150000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "dental" }, { type: "EQUIPMENT", tag: "dental-chair" }] },
      { slug: "teeth-whitening", name: "In-Clinic Teeth Whitening", category: "dental-aesthetics", description: "Supervised in-clinic whitening. An examination is required first.", importantInfo: "Not suitable with untreated decay or gum disease. Some sensitivity for 24–48 hours is common.", durationMinutes: 90, bufferAfterMinutes: 15, priceMinor: 850000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "dental" }, { type: "EQUIPMENT", tag: "dental-chair" }] },
      { slug: "cosmetic-dental-consult", name: "Cosmetic Dentistry Consultation", category: "dental-aesthetics", description: "Examination, photographs and a written treatment estimate.", durationMinutes: 30, priceMinor: 100000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "dental" }, { type: "EQUIPMENT", tag: "dental-chair" }] },
    ],
    staff: [
      { name: "Dr. Prasit Kanda", role: "Dentist", bio: "Cosmetic and restorative dentistry.", credentials: ["Sample credential — Dental registration (demo data)"], qualifications: ["Doctor of Dental Surgery (fictional sample record)"], specializations: ["Cosmetic dentistry"], languages: ["Thai", "English"], yearsExperience: 15, verified: true, services: ["teeth-whitening", "cosmetic-dental-consult"] },
      { name: "Suda Ratchada", role: "Dental Hygienist", bio: "Hygiene appointments and preventative care.", credentials: ["Sample credential — Hygienist registration (demo data)"], qualifications: ["Diploma in Dental Hygiene (fictional sample record)"], specializations: ["Preventative care"], languages: ["Thai"], yearsExperience: 8, verified: true, services: ["dental-hygiene"] },
    ],
    resources: [
      { name: "Surgery 1", type: "ROOM", tag: "dental" },
      { name: "Surgery 2", type: "ROOM", tag: "dental" },
      { name: "Dental Chair 1", type: "EQUIPMENT", tag: "dental-chair" },
      { name: "Dental Chair 2", type: "EQUIPMENT", tag: "dental-chair" },
    ],
  },
  {
    slug: "orchid-hair-scalp-clinic",
    name: "Orchid Hair & Scalp Clinic",
    legalName: "Orchid Hair Clinic Co., Ltd. (demo)",
    specialty: "Hair & Scalp",
    tagline: "Assessment-led hair and scalp care.",
    description:
      "Orchid Hair & Scalp Clinic assesses hair loss and scalp conditions before recommending any programme. We are explicit about what evidence supports each treatment and what it does not.",
    district: "Ratchathewi",
    city: "Bangkok",
    addressLine1: "26 Phetchaburi Road, Thanon Phaya Thai",
    postalCode: "10400",
    phone: "+66 2 000 1110",
    email: "hello@orchid.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 4,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "10:00", "19:00"], [2, "10:00", "19:00"], [3, "10:00", "19:00"], [4, "10:00", "19:00"], [5, "10:00", "19:00"], [6, "10:00", "16:00"]],
    services: [
      { slug: "scalp-assessment", name: "Hair & Scalp Assessment", category: "hair-scalp", description: "Trichoscopy-based assessment with a written plan and photographs for comparison.", durationMinutes: 45, priceMinor: 180000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }, { type: "EQUIPMENT", tag: "trichoscope" }] },
      { slug: "scalp-treatment", name: "Scalp Treatment Session", category: "hair-scalp", description: "In-clinic scalp treatment session within an assessed programme.", durationMinutes: 60, priceMinor: 250000, serviceClass: "MEDICAL_AESTHETIC", isMedicalAesthetic: true, requires: [{ type: "ROOM", tag: "treatment" }] },
      { slug: "hair-loss-review", name: "Hair Loss Follow-Up", category: "hair-scalp", description: "Progress review with comparison photography.", durationMinutes: 30, priceMinor: 120000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }, { type: "EQUIPMENT", tag: "trichoscope" }] },
    ],
    staff: [
      { name: "Dr. Wichai Sombat", role: "Trichologist", bio: "Hair loss assessment and medical management.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Hair loss", "Trichoscopy"], languages: ["Thai", "English"], yearsExperience: 12, verified: true, services: ["scalp-assessment", "hair-loss-review", "scalp-treatment"] },
      { name: "Pensri Kulap", role: "Scalp Therapist", bio: "In-clinic scalp treatment sessions.", credentials: ["Sample credential — Trichology certification (demo data)"], qualifications: ["Certificate in Trichology (fictional sample record)"], specializations: ["Scalp care"], languages: ["Thai"], yearsExperience: 5, verified: true, services: ["scalp-treatment"] },
    ],
    resources: [
      { name: "Assessment Room", type: "ROOM", tag: "consult" },
      { name: "Treatment Room", type: "ROOM", tag: "treatment" },
      { name: "Trichoscope", type: "EQUIPMENT", tag: "trichoscope" },
    ],
  },
  {
    slug: "pura-vida-recovery-studio",
    name: "Pura Vida Recovery Studio",
    legalName: "Pura Vida Recovery Co., Ltd. (demo)",
    specialty: "Recovery & Wellness",
    tagline: "Recovery sessions for people who train.",
    description:
      "A small recovery studio in Ekkamai offering compression therapy, sauna and guided mobility sessions. Not a medical clinic — we refer anything clinical to a physiotherapist.",
    district: "Ekkamai",
    city: "Bangkok",
    addressLine1: "9 Sukhumvit Soi 63, Khlong Tan Nuea",
    postalCode: "10110",
    phone: "+66 2 000 1111",
    email: "hello@puravida.demo.suay.store",
    status: "APPROVED",
    published: true,
    cover: 5,
    cancellationPolicy: "Free cancellation up to 6 hours before your session.",
    bookingPolicy: "Please arrive 5 minutes early. Bring your own towel and water bottle.",
    cancellationWindowHours: 6,
    hours: [[1, "07:00", "21:00"], [2, "07:00", "21:00"], [3, "07:00", "21:00"], [4, "07:00", "21:00"], [5, "07:00", "21:00"], [6, "08:00", "18:00"], [0, "08:00", "18:00"]],
    services: [
      { slug: "compression-therapy", name: "Compression Therapy Session", category: "physio-recovery", description: "A 30-minute session using pneumatic compression for the legs.", durationMinutes: 30, priceMinor: 90000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "recovery" }, { type: "EQUIPMENT", tag: "compression" }] },
      { slug: "mobility-session", name: "Guided Mobility Session", category: "physio-recovery", description: "One-to-one mobility and movement session with a coach.", durationMinutes: 45, priceMinor: 130000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "studio" }] },
      { slug: "recovery-combo", name: "Full Recovery Session", category: "physio-recovery", description: "Compression therapy followed by guided mobility work.", durationMinutes: 75, priceMinor: 190000, serviceClass: "WELLNESS", requires: [{ type: "ROOM", tag: "recovery" }, { type: "EQUIPMENT", tag: "compression" }] },
    ],
    staff: [
      { name: "Ake Thammarat", role: "Recovery Coach", bio: "Movement and recovery coaching.", credentials: ["Sample credential — Strength & conditioning certification (demo data)"], qualifications: ["Certificate in Strength & Conditioning (fictional sample record)"], specializations: ["Mobility", "Recovery"], languages: ["Thai", "English"], yearsExperience: 7, verified: true, services: ["compression-therapy", "mobility-session", "recovery-combo"] },
      { name: "Bee Somsri", role: "Recovery Coach", bio: "Compression therapy and session supervision.", credentials: ["Sample credential — Fitness instruction certification (demo data)"], qualifications: ["Certificate in Personal Training (fictional sample record)"], specializations: ["Recovery"], languages: ["Thai"], yearsExperience: 4, verified: true, services: ["compression-therapy", "recovery-combo"] },
    ],
    resources: [
      { name: "Recovery Bay 1", type: "ROOM", tag: "recovery" },
      { name: "Recovery Bay 2", type: "ROOM", tag: "recovery" },
      { name: "Studio Space", type: "ROOM", tag: "studio" },
      { name: "Compression Unit 1", type: "EQUIPMENT", tag: "compression" },
      { name: "Compression Unit 2", type: "EQUIPMENT", tag: "compression" },
    ],
  },

  // --- Clinics used to demonstrate the review and moderation workflow -------
  {
    slug: "sindhorn-aesthetic-studio",
    name: "Sindhorn Aesthetic Studio",
    legalName: "Sindhorn Aesthetic Studio Co., Ltd. (demo)",
    specialty: "Aesthetic Medicine",
    tagline: "Awaiting verification.",
    description:
      "A newly registered clinic in Lumphini. This record exists to demonstrate the registration and approval workflow: it has submitted its application and is waiting for a platform administrator to review it.",
    district: "Lumphini",
    city: "Bangkok",
    addressLine1: "18 Langsuan Road, Pathum Wan",
    postalCode: "10330",
    phone: "+66 2 000 1112",
    email: "hello@sindhorn.demo.suay.store",
    status: "PENDING_REVIEW",
    published: false,
    cover: 6,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "10:00", "19:00"], [2, "10:00", "19:00"], [3, "10:00", "19:00"], [4, "10:00", "19:00"], [5, "10:00", "19:00"]],
    services: [
      { slug: "new-consultation", name: "Initial Consultation", category: "injectables", description: "A first consultation to discuss treatment options.", durationMinutes: 30, priceMinor: 90000, serviceClass: "MEDICAL", requires: [{ type: "ROOM", tag: "consult" }] },
      { slug: "new-facial", name: "Clinic Facial", category: "skin-dermatology", description: "A cleansing and hydrating facial.", durationMinutes: 60, priceMinor: 240000, serviceClass: "AESTHETIC", requires: [{ type: "ROOM", tag: "treatment" }] },
    ],
    staff: [
      { name: "Dr. Ratchanee Suwan", role: "Aesthetic Physician", bio: "Clinic founder.", credentials: ["Sample credential — Medical registration (demo data)"], qualifications: ["Doctor of Medicine (fictional sample record)"], specializations: ["Aesthetic medicine"], languages: ["Thai", "English"], yearsExperience: 9, verified: false, services: ["new-consultation", "new-facial"] },
    ],
    resources: [
      { name: "Consultation Room", type: "ROOM", tag: "consult" },
      { name: "Treatment Room", type: "ROOM", tag: "treatment" },
    ],
  },
  {
    slug: "riverside-beauty-lounge",
    name: "Riverside Beauty Lounge",
    legalName: "Riverside Beauty Lounge Co., Ltd. (demo)",
    specialty: "Beauty & Skin",
    tagline: "Suspended pending review.",
    description:
      "This record exists to demonstrate suspension: the clinic has been suspended by a platform administrator, so it no longer appears in public search and cannot take new bookings, while its history remains available to administrators.",
    district: "Charoen Krung",
    city: "Bangkok",
    addressLine1: "1 Charoen Krung Road, Bang Rak",
    postalCode: "10500",
    phone: "+66 2 000 1113",
    email: "hello@riverside.demo.suay.store",
    status: "SUSPENDED",
    published: false,
    cover: 1,
    cancellationPolicy: STANDARD_CANCELLATION,
    bookingPolicy: STANDARD_BOOKING,
    cancellationWindowHours: 24,
    hours: [[1, "10:00", "19:00"], [2, "10:00", "19:00"], [3, "10:00", "19:00"], [4, "10:00", "19:00"], [5, "10:00", "19:00"]],
    services: [
      { slug: "riverside-facial", name: "Classic Facial", category: "skin-dermatology", description: "A cleansing facial.", durationMinutes: 60, priceMinor: 190000, serviceClass: "AESTHETIC", requires: [{ type: "ROOM", tag: "treatment" }] },
    ],
    staff: [
      { name: "Nid Charoen", role: "Aesthetician", bio: "Facial treatments.", credentials: ["Sample credential — Aesthetics certification (demo data)"], qualifications: ["Diploma in Aesthetics (fictional sample record)"], specializations: ["Facials"], languages: ["Thai"], yearsExperience: 5, verified: false, services: ["riverside-facial"] },
    ],
    resources: [{ name: "Treatment Room", type: "ROOM", tag: "treatment" }],
  },
];

export const CUSTOMER_NAMES = [
  "Anong Pattanakul", "Chaiwat Rungruang", "Dara Somsak", "Ekachai Nilsen",
  "Fon Thanakit", "Gaan Srisuk", "Hathai Ruangsri", "Ittipol Wong",
  "Jariya Meesuk", "Kamon Pichai", "Lalita Anan", "Mongkut Chaowarat",
  "Nid Kaewsai", "Orn Sukhum", "Panit Yodsiri", "Rung Sae-Tang",
  "Siriwan Doungjai", "Tanawat Boonrod", "Ubon Rattana", "Veera Suwanna",
  "Wilai Nopparat", "Yuki Tanaka", "Sophie Bennett", "Marco Silva",
];

/** Review text is written for the demo and flagged as sample data. */
export const SAMPLE_REVIEWS: { rating: number; comment: string }[] = [
  { rating: 5, comment: "Sample review. The consultation was unhurried and the practitioner explained why one of the treatments I asked about was not appropriate for me." },
  { rating: 5, comment: "Sample review. Clear pricing, no pressure to buy a package, and the appointment started on time." },
  { rating: 4, comment: "Sample review. Good experience overall. The clinic was busy so check-in took a few minutes longer than expected." },
  { rating: 5, comment: "Sample review. The aftercare instructions were written down and someone followed up two days later." },
  { rating: 4, comment: "Sample review. Professional and clean. I would have liked more parking information before arriving." },
  { rating: 5, comment: "Sample review. Straightforward and honest about what results to expect from a single session." },
  { rating: 3, comment: "Sample review. The treatment was fine but my appointment ran about twenty minutes late." },
  { rating: 5, comment: "Sample review. Very calm environment and the practitioner answered all of my questions." },
  { rating: 4, comment: "Sample review. Easy to book and the reminder was useful. Would return." },
  { rating: 5, comment: "Sample review. Appreciated that they declined to sell me something I did not need." },
];
