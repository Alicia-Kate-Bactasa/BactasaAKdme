const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const fileName = document.querySelector("#file-name");
const jsonOutput = document.querySelector("#json-output code");
const statusMessage = document.querySelector("#status-message");
const recordCount = document.querySelector("#record-count");
const emptyNote = document.querySelector("#empty-note");
const copyButton = document.querySelector("#copy-button");
const downloadButton = document.querySelector("#download-button");
const programNames = { BSIT: "Bachelor of Science in Information Technology", BSCS: "Bachelor of Science in Computer Science" };
let jsonText = "";

function parseCsvRow(row) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"' && quoted) { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function capitalize(value) {
  return value.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, boundary, letter) => `${boundary}${letter.toUpperCase()}`);
}

function transformCsv(csvText) {
  const rows = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((row) => row.trim());
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one record.");
  const headers = parseCsvRow(rows[0]).map((header) => header.toLowerCase());
  const requiredHeaders = ["student_id", "first_name", "last_name", "course", "year_level", "email", "tuition_balance"];
  const missingHeader = requiredHeaders.find((header) => !headers.includes(header));
  if (missingHeader) throw new Error(`Missing required column: ${missingHeader}`);
  return rows.slice(1).map((row) => {
    const values = parseCsvRow(row);
    const source = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const balance = Number.parseFloat(source.tuition_balance.replace(/[$,]/g, ""));
    return {
      studentId: Number.parseInt(source.student_id, 10),
      firstName: capitalize(source.first_name),
      lastName: capitalize(source.last_name),
      program: programNames[source.course.toUpperCase()] || capitalize(source.course),
      yearLevel: Number.parseInt(source.year_level, 10),
      emailAddress: source.email.toLowerCase(),
      outstandingBalance: Number(Number.isNaN(balance) ? 0 : balance.toFixed(2))
    };
  });
}

function renderRecords(records, sourceName) {
  jsonText = JSON.stringify(records, null, 2);
  jsonOutput.textContent = jsonText;
  fileName.textContent = sourceName;
  recordCount.textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;
  statusMessage.textContent = "Transformation complete";
  emptyNote.textContent = "Mapped using the 7 rules in the data map.";
  copyButton.disabled = false;
  downloadButton.disabled = false;
}

function handleFile(file) {
  if (!file || (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv")) { statusMessage.textContent = "Please choose a CSV file"; return; }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try { renderRecords(transformCsv(reader.result), file.name); }
    catch (error) { statusMessage.textContent = error.message; recordCount.textContent = "0 records"; }
  });
  reader.readAsText(file);
}

fileInput.addEventListener("change", (event) => handleFile(event.target.files[0]));
["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add("is-dragging"); }));
["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragging"); }));
dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files[0]));

copyButton.addEventListener("click", async () => { await navigator.clipboard.writeText(jsonText); statusMessage.textContent = "JSON copied to clipboard"; });
downloadButton.addEventListener("click", () => {
  const blob = new Blob([jsonText], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "transformed-students.json";
  link.click();
  URL.revokeObjectURL(link.href);
});