import AppLayout from "../components/AppLayout";
import "./LegalPage.css";

function PrivacyPolicyPage() {
  return (
    <AppLayout breadcrumbs={[{ label: "Privacy Policy" }]}>
      <section className="legal-page">
        <header>
          <h1>นโยบายความเป็นส่วนตัว (Privacy Policy)</h1>
          <p className="legal-muted">
            อัปเดตล่าสุด: 23 มกราคม 2026
          </p>
        </header>

        <div className="legal-card">
          <h2>ผู้ควบคุมข้อมูลส่วนบุคคล</h2>
          <p>
            บริษัท: SC Group (1989) Co., Ltd.
          </p>
          <p>ที่อยู่: ที่อยู่: 19 หมู่ ตำบล บางแก้ว เมือง สมุทรสงคราม 75000</p>
          <p>อีเมลติดต่อ: admin@scgroup1989.com</p>
          <p>โทรศัพท์: 086-410-1454</p>
        </div>

        <div className="legal-card">
          <h2>ข้อมูลที่เราเก็บรวบรวม</h2>
          <ul>
            <li>LINE userId และชื่อโปรไฟล์ (displayName)</li>
            <li>ข้อมูลการจอง: วันที่ เวลา สาขา และรายละเอียดบริการ</li>
            <li>เบอร์โทรศัพท์ (หากผู้ใช้กรอกให้)</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>วัตถุประสงค์ในการใช้ข้อมูล</h2>
          <ul>
            <li>ยืนยันและบริหารการจองบริการ</li>
            <li>การบริหารลูกค้าและประวัติการใช้บริการ</li>
            <li>ส่งการยืนยัน/แจ้งเตือนการจอง</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>การเปิดเผยข้อมูล</h2>
          <p>
            เราไม่ขายหรือแชร์ข้อมูลให้บุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาด
            ข้อมูลจะถูกเปิดเผยเท่าที่จำเป็นเพื่อให้บริการเท่านั้น
          </p>
        </div>

        <div className="legal-card">
          <h2>การจัดเก็บและความปลอดภัย</h2>
          <ul>
            <li>จัดเก็บข้อมูลอย่างปลอดภัยและจำกัดการเข้าถึงเฉพาะเจ้าหน้าที่ที่เกี่ยวข้อง</li>
            <li>ใช้มาตรการรักษาความปลอดภัยเชิงเทคนิคและเชิงองค์กรที่เหมาะสม</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2>ระยะเวลาการเก็บรักษาข้อมูล</h2>
          <p>
            เราจะเก็บข้อมูลเท่าที่จำเป็นต่อวัตถุประสงค์ในการให้บริการ
            หรือเป็นไปตามกฎหมายที่เกี่ยวข้อง
          </p>
        </div>

        <div className="legal-card">
          <h2>สิทธิของเจ้าของข้อมูล</h2>
          <ul>
            <li>ขอเข้าถึง/แก้ไข/ลบข้อมูลส่วนบุคคล</li>
            <li>ถอนความยินยอม หรือคัดค้านการประมวลผลข้อมูล</li>
            <li>ร้องเรียนต่อหน่วยงานกำกับดูแลตามกฎหมายไทย</li>
          </ul>
          <p>
            หากต้องการใช้สิทธิ กรุณาติดต่อ admin@scgroup1989.com หรือ 086-410-1454
          </p>
        </div>

        <div className="legal-card legal-english">
          <h2>English Summary</h2>
          <p>
            SC Glam collects LINE userId, display name, booking details, and an
            optional phone number (if provided). We use the data to manage
            reservations, customer records, and booking confirmations. We do not
            sell or share data with third parties for marketing. Data is stored
            securely and accessed only by authorized staff. Users may request
            access, correction, or deletion by contacting us.
          </p>
        </div>
      </section>
    </AppLayout>
  );
}

export default PrivacyPolicyPage;
