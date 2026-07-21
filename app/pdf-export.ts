export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pages = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  if (!pages.length) throw new Error("The paper is not ready yet.");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) pdf.addPage();
    const canvas = await html2canvas(pages[index], { scale: 1.6, backgroundColor: "#ffffff", useCORS: true, logging: false });
    const image = canvas.toDataURL("image/jpeg", .9);
    const pageWidth = 210;
    const pageHeight = 297;
    const ratio = Math.min((pageWidth - 16) / canvas.width, (pageHeight - 16) / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    pdf.addImage(image, "JPEG", (pageWidth - width) / 2, 8, width, height, undefined, "FAST");
  }
  pdf.save(filename.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-"));
}
