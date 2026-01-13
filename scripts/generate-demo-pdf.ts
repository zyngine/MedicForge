/**
 * Generate Demo Credentials PDF
 * Run with: npx tsx scripts/generate-demo-pdf.ts
 */

import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

const doc = new jsPDF();

// Colors
const primaryBlue = [30, 64, 175]; // #1e40af
const darkGray = [31, 41, 55];
const mediumGray = [107, 114, 128];
const lightBg = [243, 244, 246];

// Helper to set color
function setColor(rgb: number[]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

// Page setup
let y = 20;

// Logo/Header
doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
doc.rect(0, 0, 210, 45, "F");

doc.setTextColor(255, 255, 255);
doc.setFontSize(32);
doc.setFont("helvetica", "bold");
doc.text("MedicForge", 105, 22, { align: "center" });

doc.setFontSize(12);
doc.setFont("helvetica", "normal");
doc.text("Where First Responders Are Forged", 105, 32, { align: "center" });

doc.setFontSize(10);
doc.text("DEMO ACCESS CREDENTIALS", 105, 40, { align: "center" });

y = 55;

// Demo URL Section
setColor(darkGray);
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Demo URL", 20, y);
y += 8;

setColor(primaryBlue);
doc.setFontSize(12);
doc.setFont("helvetica", "normal");
doc.text("https://www.medicforge.net/demo", 20, y);
y += 6;

setColor(mediumGray);
doc.setFontSize(10);
doc.text("One-click demo buttons available - no password entry required!", 20, y);
y += 15;

// Instructor Account Box
doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
doc.roundedRect(15, y - 5, 85, 55, 3, 3, "F");

setColor(darkGray);
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Instructor Account", 20, y + 5);

doc.setFontSize(10);
doc.setFont("helvetica", "normal");
setColor(mediumGray);
doc.text("Name:", 20, y + 15);
doc.text("Email:", 20, y + 23);
doc.text("Password:", 20, y + 31);

setColor(darkGray);
doc.setFont("helvetica", "bold");
doc.text("Dr. Sarah Johnson", 45, y + 15);
doc.setFont("helvetica", "normal");
doc.text("demo.instructor@medicforge.net", 38, y + 23);
doc.text("DemoPass123!", 45, y + 31);

setColor(mediumGray);
doc.setFontSize(8);
doc.text("Course management, grading, competency tracking", 20, y + 42);

// Student Account Box
doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
doc.roundedRect(110, y - 5, 85, 55, 3, 3, "F");

setColor(darkGray);
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Student Account", 115, y + 5);

doc.setFontSize(10);
doc.setFont("helvetica", "normal");
setColor(mediumGray);
doc.text("Name:", 115, y + 15);
doc.text("Email:", 115, y + 23);
doc.text("Password:", 115, y + 31);

setColor(darkGray);
doc.setFont("helvetica", "bold");
doc.text("Michael Chen", 140, y + 15);
doc.setFont("helvetica", "normal");
doc.text("demo.student@medicforge.net", 133, y + 23);
doc.text("DemoPass123!", 140, y + 31);

setColor(mediumGray);
doc.setFontSize(8);
doc.text("Courses, quizzes, clinical hours, skills", 115, y + 42);

y += 60;

// Enrollment Code
setColor(darkGray);
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Enrollment Code:", 20, y);

doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
doc.roundedRect(65, y - 5, 40, 10, 2, 2, "F");
doc.setTextColor(255, 255, 255);
doc.setFontSize(14);
doc.text("DEMO-EMT", 85, y + 2, { align: "center" });

y += 15;

// Demo Data Section
setColor(darkGray);
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Demo Data Included", 20, y);
y += 8;

const demoData = [
  ["2 Courses", "EMT Basic & Paramedic programs"],
  ["8 Students", "With varied progress (30-92%)"],
  ["5 Modules", "Video & document lessons"],
  ["4 Assignments", "Including timed quizzes"],
  ["19 Skills", "NREMT competencies tracked"],
  ["3 Clinical Sites", "Hospital, Ambulance, Fire Dept"],
  ["63 Shifts", "Bookable clinical rotations"],
];

doc.setFontSize(10);
demoData.forEach((item, i) => {
  const col = i < 4 ? 0 : 1;
  const row = i < 4 ? i : i - 4;
  const xBase = col === 0 ? 20 : 110;
  const yBase = y + row * 10;

  doc.setFont("helvetica", "bold");
  setColor(primaryBlue);
  doc.text(item[0], xBase, yBase);

  doc.setFont("helvetica", "normal");
  setColor(mediumGray);
  doc.text(" - " + item[1], xBase + doc.getTextWidth(item[0]), yBase);
});

y += 45;

// Pricing Section
setColor(darkGray);
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Subscription Tiers", 20, y);
y += 10;

const tiers = [
  { name: "Free", price: "$0/mo", desc: "1 instructor, 25 students, 2 courses" },
  { name: "Pro", price: "$149/mo", desc: "5 instructors, 100 students, unlimited courses" },
  { name: "Institution", price: "$399/mo", desc: "Unlimited instructors, 500 students" },
  { name: "Enterprise", price: "Custom", desc: "Unlimited everything, dedicated support" },
];

const tierWidth = 45;
tiers.forEach((tier, i) => {
  const x = 20 + i * tierWidth;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(x - 2, y - 3, tierWidth - 5, 28, 2, 2, "F");

  setColor(darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(tier.name, x, y + 5);

  setColor(primaryBlue);
  doc.setFontSize(11);
  doc.text(tier.price, x, y + 13);

  setColor(mediumGray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(tier.desc, tierWidth - 10);
  doc.text(lines, x, y + 20);
});

y += 40;

// Footer
doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
doc.rect(0, 275, 210, 22, "F");

doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.text("Questions? Contact sales@medicforge.net", 105, 284, { align: "center" });
doc.setFontSize(8);
doc.text("www.medicforge.net", 105, 291, { align: "center" });

// Save the PDF
const outputPath = path.join(process.env.USERPROFILE || process.env.HOME || ".", "MedicForge-Demo-Credentials.pdf");
const pdfBuffer = doc.output("arraybuffer");
fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));

console.log(`\n✅ PDF generated successfully!`);
console.log(`📄 Saved to: ${outputPath}\n`);
