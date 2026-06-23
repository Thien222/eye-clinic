import React from 'react';
import { ClinicSettings, Patient, RefractionData } from '../types';

interface Props {
  settings: ClinicSettings;
  patient: Patient;
  refraction: RefractionData;
  pd?: string;
  performedDate?: Date;
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: '12px',
    lineHeight: 1.45,
    color: '#000',
    background: '#fff',
    width: '148mm',
    minHeight: '200mm',
    padding: '6mm 8mm',
    boxSizing: 'border-box',
    margin: '0 auto',
  },
  /* ---- header ---- */
  headerRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '3mm' },
  headerLeft: { flex: '0 0 55%', textAlign: 'left' },
  headerRight: { flex: '0 0 42%', textAlign: 'right' },
  hBold: { fontWeight: 'bold', margin: 0, fontSize: '12px' },
  hMeta: { margin: 0, fontSize: '11px' },
  hItalic: { margin: 0, fontSize: '11px', fontStyle: 'italic' },
  logo: { maxHeight: '12mm', marginBottom: '2mm', display: 'block' },
  /* ---- title ---- */
  titleBlock: { textAlign: 'center', margin: '4mm 0 3mm' },
  title: { fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase', margin: 0 },
  date: { fontSize: '11px', fontStyle: 'italic', margin: '2mm 0 0' },
  /* ---- patient info ---- */
  piRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', fontSize: '12px', textAlign: 'left' },
  piAddr: { marginBottom: '3mm', fontSize: '12px', textAlign: 'left' },
  /* ---- table commons ---- */
  tbl: { width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' },
  th: {
    border: '1px solid #000', padding: '2px 4px', textAlign: 'center',
    fontWeight: 'bold', fontSize: '11px', verticalAlign: 'middle', background: '#fff',
  },
  td: {
    border: '1px solid #000', padding: '2px 4px', textAlign: 'center',
    fontSize: '11px', verticalAlign: 'middle',
  },
  tdLeft: {
    border: '1px solid #000', padding: '3px 5px', textAlign: 'left',
    fontSize: '11px', verticalAlign: 'middle',
  },
  tdBig: {
    border: '1px solid #000', padding: '2px 4px', textAlign: 'center',
    fontSize: '13px', fontWeight: 'bold', verticalAlign: 'middle',
  },
  tdSlash: {
    border: '1px solid #000', padding: '2px 4px', textAlign: 'center',
    verticalAlign: 'middle',
    background: 'linear-gradient(to top right, transparent calc(50% - 1px), #999 calc(50% - 1px), #999 calc(50% + 1px), transparent calc(50% + 1px))',
  },
  thEn: { fontWeight: 'normal', fontStyle: 'italic', fontSize: '9px' },
  /* ---- notes ---- */
  notesBox: { marginBottom: '3mm' },
  notesLine: { minHeight: '12mm', borderBottom: '1px solid #000', paddingTop: '2mm', paddingBottom: '2mm' },
  disclaimer: {
    border: '1px solid #000', padding: '3mm', marginBottom: '4mm',
    fontSize: '10px', textAlign: 'justify', lineHeight: 1.5,
  },
  /* ---- signatures ---- */
  sigRow: { display: 'flex', justifyContent: 'space-between', marginTop: '6mm' },
  sigBox: { textAlign: 'center', width: '45%' },
  sigSpace: { height: '20mm' },
};

const En = ({ s }: { s: string }) => (
  <span style={S.thEn}>{s}</span>
);

export const RefractionPrintSheet: React.FC<Props> = ({
  settings, patient, refraction, pd, performedDate,
}) => {
  const date = performedDate || new Date(patient.timestamp);
  const dateStr = date.toLocaleDateString('vi-VN');
  const pdValue = pd || refraction.finalRx.od.pd || refraction.finalRx.os.pd || '';
  const rp = settings.refraction;
  const sheetTitle = rp?.title?.trim() || 'PHIẾU KHÚC XẠ';
  const serviceTitle = rp?.rightHeader?.trim() || 'KHÁM KHÚC XẠ';
  const workingHours = settings.workingHours || 'Từ 8h đến 19h, Thứ hai đến Chủ nhật';
  const sigLabel1 = rp?.sigLabel1?.trim() || 'Xác nhận của khách hàng';
  const sigLabel2 = rp?.sigLabel2?.trim() || 'Người thực hiện';
  const sigSubText = rp?.sigSubText?.trim() || '(Ký và ghi rõ họ tên)';

  const disclaimer1 = rp?.disclaimer1 ||
    '1. Khách hàng đã được đeo thử kính và cảm thấy thoải mái khi đi lại, không có hiện tượng nhức mắt hay đau đầu. Mức độ thích nghi của mỗi người có thể khác nhau, vì vậy thời gian làm quen với kính có thể từ 5 – 7 ngày.';
  const disclaimer2 = rp?.disclaimer2 ||
    '2. Khách hàng đã được tư vấn về độ kính phù hợp, mọi điều chỉnh theo nhu cầu riêng sẽ được thực hiện theo mong muốn cá nhân sau khi đã được giải thích rõ ràng.';

  return (
    <div style={S.wrap}>

      {/* ===== HEADER ===== */}
      <div style={S.headerRow}>
        <div style={S.headerLeft}>
          {settings.logoUrl && settings.invoice?.showLogo !== false && (
            <img src={settings.logoUrl} alt="Logo" style={S.logo} />
          )}
          <p style={{ ...S.hBold, textDecoration: 'underline' }}>{settings.name || 'PHÒNG KHÁM MẮT NGOÀI GIỜ'}</p>
          <p style={S.hBold}>{settings.doctorName || ''}</p>
          <p style={S.hMeta}>SĐT: {settings.phone || ''}{settings.email ? ` – ${settings.email}` : ''}</p>
          {settings.address && <p style={S.hMeta}>ĐC: {settings.address}</p>}
        </div>
        <div style={S.headerRight}>
          <p style={{ ...S.hBold, textDecoration: 'underline' }}>{serviceTitle}</p>
          <p style={S.hItalic}>{workingHours}</p>
        </div>
      </div>

      {/* ===== TITLE ===== */}
      <div style={S.titleBlock}>
        <h1 style={S.title as React.CSSProperties}>{sheetTitle}</h1>
        <p style={S.date}>Ngày thực hiện: {dateStr}</p>
      </div>

      {/* ===== PATIENT INFO ===== */}
      <div style={S.piRow}>
        <span><b>Họ và tên:</b> {patient.fullName}</span>
        <span><b>Giới tính:</b> {patient.gender}</span>
      </div>
      <div style={S.piRow}>
        <span><b>Ngày sinh:</b> {patient.dob}</span>
        <span><b>SĐT:</b> {patient.phone}</span>
      </div>
      <div style={S.piAddr}><b>Địa chỉ:</b> {patient.address}</div>

      {/* ===== TABLE 1: THỊ LỰC ===== */}
      <table style={S.tbl}>
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.th} rowSpan={2}>
              <b>Thị lực không kính/kính cũ</b> (Nếu có)<br />
              <En s="(UCVA/ with old glasses)" />
            </th>
            <th style={S.th}><b>Mắt phải</b> <En s="(OD)" /></th>
            <th style={S.th}><b>Mắt trái</b> <En s="(OS)" /></th>
            <th style={S.th}><b>KCĐT</b> <En s="(PD)" /></th>
          </tr>
          <tr>
            <td style={S.tdBig}>{patient.initialVA?.od || ''}</td>
            <td style={S.tdBig}>{patient.initialVA?.os || ''}</td>
            <td style={S.tdBig}>{pdValue}</td>
          </tr>
        </thead>
      </table>

      {/* ===== TABLE 2: KX KHÁCH QUAN + CHỦ QUAN (gộp 1 bảng) ===== */}
      <table style={S.tbl}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '18%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.th}></th>
            <th style={S.th}><b>Mắt</b><br /><En s="(Eye)" /></th>
            <th style={S.th}><b>Độ cầu/viễn</b><br /><En s="(SPH)" /></th>
            <th style={S.th}><b>Độ loạn</b><br /><En s="(CYL)" /></th>
            <th style={S.th}><b>Trục loạn</b><br /><En s="(AXIS)" /></th>
            <th style={S.th}><b>Thị lực</b><br /><En s="(BCVA)" /></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={S.tdLeft} rowSpan={2}>
              <b>Khúc xạ khách quan</b><br />
              <span style={S.thEn}>(Skiascopy)</span>
              {refraction.skiascopy.cycloplegia && (
                <><br /><span style={{ color: 'red', fontSize: '9px' }}>- Có liệt điều tiết -</span></>
              )}
            </td>
            <td style={S.td}>Mắt phải <En s="(OD)" /></td>
            <td style={S.tdBig}>{refraction.skiascopy.od.sph}</td>
            <td style={S.tdBig}>{refraction.skiascopy.od.cyl}</td>
            <td style={S.tdBig}>{refraction.skiascopy.od.axis}</td>
            <td style={S.tdSlash}></td>
          </tr>
          <tr>
            <td style={S.td}>Mắt trái <En s="(OS)" /></td>
            <td style={S.tdBig}>{refraction.skiascopy.os.sph}</td>
            <td style={S.tdBig}>{refraction.skiascopy.os.cyl}</td>
            <td style={S.tdBig}>{refraction.skiascopy.os.axis}</td>
            <td style={S.tdSlash}></td>
          </tr>
          <tr>
            <td style={S.tdLeft} rowSpan={2}>
              <b>Khúc xạ chủ quan</b><br />
              <span style={S.thEn}>(Subj. refraction)</span>
            </td>
            <td style={S.td}>Mắt phải <En s="(OD)" /></td>
            <td style={S.tdBig}>{refraction.subjective.od.sph}</td>
            <td style={S.tdBig}>{refraction.subjective.od.cyl}</td>
            <td style={S.tdBig}>{refraction.subjective.od.axis}</td>
            <td style={S.tdBig}>{refraction.subjective.od.va}</td>
          </tr>
          <tr>
            <td style={S.td}>Mắt trái <En s="(OS)" /></td>
            <td style={S.tdBig}>{refraction.subjective.os.sph}</td>
            <td style={S.tdBig}>{refraction.subjective.os.cyl}</td>
            <td style={S.tdBig}>{refraction.subjective.os.axis}</td>
            <td style={S.tdBig}>{refraction.subjective.os.va}</td>
          </tr>
        </tbody>
      </table>

      {/* ===== TABLE 3: KÍNH ĐIỀU CHỈNH ===== */}
      <table style={S.tbl}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={S.th}></th>
            <th style={S.th}><b>Mắt</b><br /><En s="(Eye)" /></th>
            <th style={S.th}><b>Độ cầu/viễn</b><br /><En s="(SPH)" /></th>
            <th style={S.th}><b>Độ loạn</b><br /><En s="(CYL)" /></th>
            <th style={S.th}><b>Trục loạn</b></th>
            <th style={S.th}><b>Thị lực</b></th>
            <th style={S.th}><b>ADD</b></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={S.tdLeft} rowSpan={2}>
              <b>Kính điều chỉnh</b><br />
              <span style={S.thEn}>(Prescription)</span>
            </td>
            <td style={S.td}>Mắt phải <En s="(OD)" /></td>
            <td style={S.tdBig}>{refraction.finalRx.od.sph}</td>
            <td style={S.tdBig}>{refraction.finalRx.od.cyl}</td>
            <td style={S.tdBig}>{refraction.finalRx.od.axis}</td>
            <td style={S.tdBig}>{refraction.finalRx.od.va}</td>
            <td style={S.tdBig}>{refraction.finalRx.od.add}</td>
          </tr>
          <tr>
            <td style={S.td}>Mắt trái <En s="(OS)" /></td>
            <td style={S.tdBig}>{refraction.finalRx.os.sph}</td>
            <td style={S.tdBig}>{refraction.finalRx.os.cyl}</td>
            <td style={S.tdBig}>{refraction.finalRx.os.axis}</td>
            <td style={S.tdBig}>{refraction.finalRx.os.va}</td>
            <td style={S.tdBig}>{refraction.finalRx.os.add}</td>
          </tr>
        </tbody>
      </table>

      {/* ===== LOẠI KÍNH ===== */}
      <table style={S.tbl}>
        <colgroup>
          <col style={{ width: '20%' }} />
          <col style={{ width: '80%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={S.tdLeft}>
              <b>Loại kính</b><br /><span style={S.thEn}>(Type)</span>
            </td>
            <td style={{ ...S.tdLeft, fontWeight: 'bold', fontSize: '12px' }}>
              {refraction.finalRx.lensType}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ===== GHI CHÚ ===== */}
      <div style={S.notesBox}>
        <b>Ghi chú:</b>
        <div style={S.notesLine}>{refraction.note}</div>
      </div>

      {/* ===== LƯU Ý ===== */}
      <div style={S.disclaimer}>
        <b>Lưu ý:</b><br />
        {disclaimer1}<br />
        {disclaimer2}
      </div>

      {/* ===== CHỮ KÝ ===== */}
      <div style={S.sigRow}>
        <div style={S.sigBox}>
          <b>{sigLabel1}</b>
          <div style={S.sigSpace}></div>
          <span style={{ fontSize: '10px' }}>{sigSubText}</span>
        </div>
        <div style={S.sigBox}>
          <b>{sigLabel2}</b>
          <div style={S.sigSpace}></div>
          <span style={{ fontSize: '10px' }}>{sigSubText}</span>
        </div>
      </div>

    </div>
  );
};
