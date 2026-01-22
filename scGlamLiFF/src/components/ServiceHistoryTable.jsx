const columns = [
  { key: "dateTime", label: "วันที่เวลา" },
  { key: "serviceName", label: "ชื่อบริการ" },
  { key: "provider", label: "ผู้ให้บริการ" },
  { key: "scrub", label: "scrub" },
  { key: "facialMask", label: "Facial mask" },
  { key: "misting", label: "misting" },
  { key: "extraPrice", label: "ราคาเพิ่มเติม" },
  { key: "note", label: "หมายเหตุ" }
];

function ServiceHistoryTable({ history }) {
  const isSectioned = history && !Array.isArray(history);
  const sections = isSectioned
    ? [
        { title: "ประวัติการซื้อคอร์ส", rows: history.purchaseRows || [] },
        { title: "ประวัติการเข้าใช้บริการ", rows: history.usageRows || [] }
      ]
    : [{ title: "ประวัติการให้บริการ", rows: history || [] }];

  const hasAnyRows = sections.some((section) => section.rows.length > 0);

  return (
    <section className="service-history">
      <h2>ประวัติการให้บริการ</h2>
      {!hasAnyRows ? (
        <p className="service-history__empty">ยังไม่มีประวัติการใช้บริการ</p>
      ) : (
        sections.map((section) =>
          section.rows.length ? (
            <div key={section.title} className="service-history__section">
              {isSectioned ? <h3>{section.title}</h3> : null}
              <div className="service-history__table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.id}>
                        {columns.map((column) => (
                          <td key={`${row.id}-${column.key}`} data-label={column.label}>
                            {row[column.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null
        )
      )}
    </section>
  );
}

export default ServiceHistoryTable;
