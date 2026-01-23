import AppLayout from "../components/AppLayout";
import "./LegalPage.css";

function TermsPage() {
  return (
    <AppLayout breadcrumbs={[{ label: "Terms" }]}>
      <section className="legal-page">
        <header>
          <h1>ข้อกำหนดและเงื่อนไขการใช้บริการ (Terms)</h1>
          <p className="legal-muted">
            อัปเดตล่าสุด: 23 มกราคม 2026
          </p>
        </header>

        <div className="legal-card">
          <h2>การใช้งานบริการ</h2>
          <ul>
            <li>ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องเพื่อการจอง</li>
            <li>การจองถือว่ายืนยันเมื่อระบบแสดงผลสำเร็จ</li>
            <li>ผู้ใช้มีหน้าที่ดูแลอุปกรณ์และบัญชีของตนเอง</li>
            <li>
              ร้านถือว่าการแสดง QR code จากบัญชีผู้ใช้เป็นการยืนยันสิทธิ์โดยชอบ
            </li>
            <li>
              ร้านไม่รับผิดชอบกรณีอุปกรณ์สูญหาย ถูกขโมย หรือมีผู้อื่นนำไปใช้โดยไม่ได้รับอนุญาต
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>นโยบายการยกเลิก / คืนเงิน</h2>
          <ul>
            <li>ยกเลิกก่อน 24 ชั่วโมง: คืนเงินเต็มจำนวน</li>
            <li>
              ยกเลิกภายในวันนัด: ไม่คืนเงิน แต่เลื่อนวันได้ 1 ครั้ง
            </li>
            <li>
              เลื่อนวันได้ 1 ครั้งต่อการซื้อ/ต่อคอร์ส หากเลื่อนแล้วไม่มาอีกถือว่าสละสิทธิ์
            </li>
            <li>
              กรณีร้านเป็นฝ่ายยกเลิก (เช่น พนักงานป่วย/เครื่องเสีย)
              ลูกค้าเลื่อนวันได้ไม่จำกัดครั้ง หรือคืนเงินเต็มจำนวน
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>เงื่อนไขด้านเวลา</h2>
          <ul>
            <li>ห้ามจองย้อนหลัง: ระบบล็อกไม่ให้จองวัน/เวลาที่ผ่านมาแล้ว</li>
            <li>ต้องจองล่วงหน้าอย่างน้อย 1–2 ชั่วโมง</li>
            <li>รอบการจองเปิดทุก 45–50 นาทีเพื่อเป็นเวลาเผื่อหลังบริการ</li>
            <li>
              ระบบจะปิดรับการจองล่วงหน้าก่อนเวลาปิดร้าน XX นาที
              (เช่น ร้านปิด 19:00 เคสสุดท้ายเริ่มไม่เกิน 18:15)
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>การนัดหมายและการเปลี่ยนแปลง</h2>
          <ul>
            <li>การเลื่อนนัดเป็นไปตามเงื่อนไขที่ระบุในระบบ</li>
            <li>กรณีไม่มาตามนัดอาจถือว่าใช้สิทธิ์แล้ว</li>
            <li>
              หากมาสายเกิน 10 นาที ร้านขอสงวนสิทธิ์ลดเวลาบริการเพื่อให้จบตามกำหนดเดิม
              หรือถือเป็นการยกเลิก
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>การจัดการคิวหน้าร้าน (Walk-in vs Online)</h2>
          <ul>
            <li>
              ระบบออนไลน์เชื่อมกับหลังบ้านที่พนักงานอัปเดตได้ทันทีเพื่อป้องกันการจองซ้อน
            </li>
            <li>
              หากมี Walk-in และพนักงานรับเคสแล้ว จะมีการปิดสล็อตเวลานั้นในระบบทันที
            </li>
            <li>
              กรณีจองซ้อนจากความผิดพลาดของระบบ ร้านขอสงวนสิทธิ์เลื่อนเวลา
              หรือคืนเงินเต็มจำนวน
            </li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>การสแกนและการใช้สิทธิ์</h2>
          <ul>
            <li>เมื่อ QR code ถูกสแกนและระบบยืนยันแล้ว ถือว่าใช้บริการเรียบร้อย</li>
            <li>ไม่สามารถย้อนกลับหรือคืนสิทธิ์ได้หลังการสแกนสำเร็จ</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>การโต้แย้งและการตรวจสอบ</h2>
          <ul>
            <li>หากมีข้อโต้แย้ง ร้านจะตรวจสอบจากบันทึกในระบบเป็นหลัก</li>
            <li>บันทึกประกอบด้วยวันเวลา สาขา และพนักงานที่ให้บริการ</li>
            <li>คำตัดสินของร้านถือเป็นที่สิ้นสุด</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>การชำระเงิน</h2>
          <p>
            หากมีการชำระเงินผ่านระบบ จะเป็นไปตามเงื่อนไขและช่องทางที่ระบบรองรับ
          </p>
        </div>

        <div className="legal-card">
          <h2>การติดต่อ</h2>
          <p>บริษัท: SC Group (1989) Co., Ltd.</p>
          <p>ที่อยู่: 19 หมู่ ตำบล บางแก้ว เมือง สมุทรสงคราม 75000</p>
          <p>อีเมลติดต่อ: admin@scgroup1989.com</p>
          <p>โทรศัพท์: 086-410-1454</p>
        </div>

        <div className="legal-card legal-english">
          <h2>English Summary</h2>
          <p>
            By using SC Glam, you agree to provide accurate booking information
            and keep your account secure. Cancellations made 24 hours in advance
            are fully refundable; same-day cancellations are non-refundable but
            allow one reschedule. Bookings require 1–2 hours lead time and are
            scheduled in 45–50 minute slots. Late arrivals may result in shorter
            service or cancellation. Walk-ins may close slots to prevent double
            booking. Scanned QR codes are considered used and cannot be reversed.
            Disputes are reviewed using system logs. Contact us for questions.
          </p>
        </div>
      </section>
    </AppLayout>
  );
}

export default TermsPage;
