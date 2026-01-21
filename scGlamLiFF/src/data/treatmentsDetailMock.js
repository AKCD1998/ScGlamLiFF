import smoothImage from "../assets/smooth.png";

const treatmentsDetailMock = [
  {
    slug: "smooth",
    name: "Smooth",
    shortDesc: "ทรีตเมนต์เพื่อผิวเรียบเนียน ดูใสอย่างเป็นธรรมชาติ",
    heroImage: smoothImage,
    ratingSummary: 4.8,
    subScores: [
      { label: "การจัดอันดับสถานที่", score: 4.7 },
      { label: "บรรยากาศ", score: 4.9 },
      { label: "ความสะอาด", score: 4.8 },
      { label: "พนักงาน", score: 4.9 },
      { label: "คุ้มค่า", score: 4.6 }
    ],
    branches: [
      {
        name: "สาขา Central Rama 9",
        hours: "Mon-Sun 11:00-20:00",
        mapEmbedUrl:
          "https://maps.google.com/maps?q=central%20rama%209&t=&z=13&ie=UTF8&iwloc=&output=embed"
      },
      {
        name: "สาขา Siam Paragon",
        hours: "Mon-Sun 11:00-20:00",
        mapEmbedUrl:
          "https://maps.google.com/maps?q=siam%20paragon&t=&z=13&ie=UTF8&iwloc=&output=embed"
      }
    ],
    packages: [
      {
        id: "smooth-1x",
        title: "1 ครั้ง",
        price: 399,
        promos: []
      },
      {
        id: "smooth-3x",
        title: "3 ครั้ง",
        price: 999,
        promos: [
          "ซื้อคอร์ส 3 ครั้งตอนนี้ รับคูปอง Facial Mask ฟรี 1 ครั้ง (มูลค่า 200 บาท)"
        ]
      },
      {
        id: "smooth-10x",
        title: "10 ครั้ง",
        price: 2999,
        promos: [
          "ซื้อคอร์สนี้ตอนนี้ ได้ Facial Mask ฟรี เพิ่มใน Treatment 4 ครั้ง",
          "แถมคอร์ส Exclusive เพิ่มอีก 1 ครั้ง (มูลค่ารวมกว่า 1500 บาท)"
        ]
      }
    ],
    recommended: [
      { id: "renew", name: "Glam Renew Clinic", rating: 4.7 },
      { id: "shine", name: "Silky Shine Facial", rating: 4.8 },
      { id: "expert", name: "Expert Bright Course", rating: 4.6 }
    ],
    reviews: [
      {
        id: "review-1",
        name: "Kanya",
        rating: 5,
        comment: "บริการดีมาก ผิวดูใสขึ้นทันทีหลังทำ",
        daysAgo: 3
      },
      {
        id: "review-2",
        name: "Mint",
        rating: 4,
        comment: "บรรยากาศดี เดินทางสะดวก พนักงานแนะนำละเอียด",
        daysAgo: 7
      },
      {
        id: "review-3",
        name: "Pim",
        rating: 5,
        comment: "คอร์สคุ้มค่า ได้โปรเสริมหลายอย่าง",
        daysAgo: 12
      }
    ]
  }
];

export default treatmentsDetailMock;
