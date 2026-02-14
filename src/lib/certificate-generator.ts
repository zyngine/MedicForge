import { Certificate, CertificateTemplate } from "@/lib/hooks/use-certificates";

interface CertificateData {
  certificate: Certificate;
  template?: CertificateTemplate | null;
  tenant?: {
    name: string;
    logo_url?: string;
  };
}

// Generate certificate HTML from template
export function generateCertificateHTML(data: CertificateData): string {
  const { certificate, template, tenant } = data;

  // Default template if none provided
  const templateHTML = template?.template_html || getDefaultTemplate();
  const styles = template?.styles || getDefaultStyles();

  // Replace placeholders
  let html = templateHTML;
  const replacements: Record<string, string> = {
    "{{logo}}": tenant?.logo_url
      ? `<img src="${tenant.logo_url}" alt="${tenant.name}" class="logo-img" />`
      : `<span class="logo-text">${tenant?.name || "MedicForge"}</span>`,
    "{{student_name}}": certificate.student?.full_name || "Student Name",
    "{{course_title}}": certificate.course?.title || "Course Title",
    "{{course_type}}": certificate.course?.course_type || "",
    "{{grade}}": certificate.final_grade?.toFixed(1) || "N/A",
    "{{hours}}": certificate.hours_completed?.toString() || "N/A",
    "{{completion_date}}": formatDate(certificate.completion_date),
    "{{issued_date}}": formatDate(certificate.issued_at),
    "{{certificate_number}}": certificate.certificate_number,
    "{{verification_code}}": certificate.verification_code,
    "{{signature_name}}": template?.signature_name || "Program Director",
    "{{signature_title}}": template?.signature_title || "Director of Education",
    "{{title}}": certificate.title,
    "{{tenant_name}}": tenant?.name || "MedicForge",
  };

  // Handle conditional sections
  html = processConditionals(html, {
    show_grade: template?.show_grade !== false && certificate.final_grade !== null,
    show_hours: template?.show_hours !== false && certificate.hours_completed !== null,
    show_date: template?.show_date !== false,
    show_verification_code: template?.show_verification_code !== false,
  });

  // Replace all placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(escapeRegExp(placeholder), "g"), value);
  }

  // Wrap with full HTML document
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate - ${certificate.certificate_number}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();
}

// Process Handlebars-style conditionals
function processConditionals(html: string, conditions: Record<string, boolean>): string {
  for (const [condition, value] of Object.entries(conditions)) {
    const regex = new RegExp(`\\{\\{#if ${condition}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, "g");
    html = html.replace(regex, value ? "$1" : "");
  }
  return html;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDefaultTemplate(): string {
  return `
<div class="certificate">
  <div class="border-outer">
    <div class="border-inner">
      <div class="certificate-content">
        <div class="header">
          <div class="logo">{{logo}}</div>
          <h1 class="title">{{title}}</h1>
        </div>

        <div class="body">
          <p class="presented-to">This is to certify that</p>
          <h2 class="student-name">{{student_name}}</h2>
          <p class="completion-text">has successfully completed the course</p>
          <h3 class="course-title">{{course_title}}</h3>

          <div class="details">
            {{#if show_grade}}<p class="detail">Final Grade: <strong>{{grade}}%</strong></p>{{/if}}
            {{#if show_hours}}<p class="detail">Hours Completed: <strong>{{hours}}</strong></p>{{/if}}
            {{#if show_date}}<p class="detail">Completion Date: <strong>{{completion_date}}</strong></p>{{/if}}
          </div>
        </div>

        <div class="footer">
          <div class="signature-section">
            <div class="signature-line"></div>
            <p class="signature-name">{{signature_name}}</p>
            <p class="signature-title">{{signature_title}}</p>
          </div>

          <div class="verification-section">
            <p class="cert-number">Certificate #: {{certificate_number}}</p>
            {{#if show_verification_code}}<p class="verify-code">Verification: {{verification_code}}</p>{{/if}}
            <p class="verify-url">Verify at: medicforge.net/verify</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `.trim();
}

function getDefaultStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Open Sans', sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }

    .certificate {
      width: 1000px;
      height: 700px;
      background: linear-gradient(135deg, #fefefe 0%, #f8f8f8 100%);
      position: relative;
    }

    .border-outer {
      position: absolute;
      inset: 10px;
      border: 3px solid #C53030;
    }

    .border-inner {
      position: absolute;
      inset: 8px;
      border: 1px solid #C53030;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .certificate-content {
      text-align: center;
      padding: 40px;
      width: 100%;
    }

    .header {
      margin-bottom: 30px;
    }

    .logo {
      margin-bottom: 20px;
    }

    .logo-img {
      max-height: 60px;
      max-width: 200px;
    }

    .logo-text {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: #C53030;
    }

    .title {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 700;
      color: #1A202C;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .body {
      margin-bottom: 30px;
    }

    .presented-to {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }

    .student-name {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 700;
      color: #C53030;
      margin-bottom: 15px;
      border-bottom: 2px solid #C53030;
      display: inline-block;
      padding: 0 30px 5px;
    }

    .completion-text {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }

    .course-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #1A202C;
      margin-bottom: 20px;
    }

    .details {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-top: 15px;
    }

    .detail {
      font-size: 14px;
      color: #444;
    }

    .detail strong {
      color: #1A202C;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 40px;
      margin-top: 30px;
    }

    .signature-section {
      text-align: center;
    }

    .signature-line {
      width: 200px;
      height: 1px;
      background: #333;
      margin-bottom: 8px;
    }

    .signature-name {
      font-weight: 600;
      font-size: 14px;
      color: #1A202C;
    }

    .signature-title {
      font-size: 12px;
      color: #666;
    }

    .verification-section {
      text-align: right;
    }

    .cert-number,
    .verify-code,
    .verify-url {
      font-size: 11px;
      color: #888;
      margin-bottom: 3px;
    }

    .verify-code {
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .certificate {
        box-shadow: none;
      }
    }
  `.trim();
}

// Generate a printable certificate page
export function openCertificatePrintWindow(html: string): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// Download certificate as HTML file
export function downloadCertificateHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
