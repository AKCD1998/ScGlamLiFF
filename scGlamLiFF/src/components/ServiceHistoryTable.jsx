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
  return (
    <section className="service-history">
      <h2>ประวัติการให้บริการ</h2>
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
            {history.map((row) => (
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
    </section>
  );
}

export default ServiceHistoryTable;
