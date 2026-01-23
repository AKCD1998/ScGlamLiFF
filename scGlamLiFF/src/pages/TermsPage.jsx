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
          </ul>
        </div>

        <div className="legal-card">
          <h2>การนัดหมายและการเปลี่ยนแปลง</h2>
          <ul>
            <li>การเลื่อนนัดเป็นไปตามเงื่อนไขที่ระบุในระบบ</li>
            <li>กรณีไม่มาตามนัดอาจถือว่าใช้สิทธิ์แล้ว</li>
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
          <p>อีเมลติดต่อ: [อีเมลติดต่อ] (แก้ไขได้ภายหลัง)</p>
          <p>โทรศัพท์: [เบอร์โทรศัพท์] (แก้ไขได้ภายหลัง)</p>
          <p>ที่อยู่: [ที่อยู่บริษัท] (แก้ไขได้ภายหลัง)</p>
        </div>

        <div className="legal-card legal-english">
          <h2>English Summary</h2>
          <p>
            By using SC Glam, you agree to provide accurate booking information.
            Rescheduling and no-show policies follow the rules shown in the app.
            Payment terms (if any) follow the supported payment methods. Contact
            us for questions or requests.
          </p>
        </div>
      </section>
    </AppLayout>
  );
}

export default TermsPage;
