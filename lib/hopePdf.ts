// Fills the official City of Detroit 2026 HOPE application PDF (public/forms/2026-hope-application.pdf).
// Works in the browser and in Node; nothing is sent anywhere.
import { PDFArray, PDFDocument, PDFName, PDFRef, StandardFonts, type PDFForm } from "pdf-lib";
import { NAME_BOX_4988, PAGE, planFill, type ApplicationData } from "./hopeFields";

export { HOPE_PDF_PATH, planFill, type ApplicationData, type ApplicationAdult, type FillPlan } from "./hopeFields";

/** Remove pages, first detaching their widgets from shared fields so the form stays valid. */
function removePages(doc: PDFDocument, form: PDFForm, indexes: number[]) {
  const doomed = new Set<PDFRef>();
  for (const i of indexes) {
    const annots = doc.getPage(i).node.lookup(PDFName.of("Annots"), PDFArray);
    annots?.asArray().forEach((a) => a instanceof PDFRef && doomed.add(a));
  }
  for (const field of form.getFields()) {
    const af = field.acroField;
    const kids = af.dict.lookup(PDFName.of("Kids"));
    if (kids instanceof PDFArray) {
      for (let k = kids.size() - 1; k >= 0; k--) {
        const ref = kids.get(k);
        if (ref instanceof PDFRef && doomed.has(ref)) kids.remove(k);
      }
      if (kids.size() === 0) form.acroForm.removeField(af);
    } else if (doomed.has(af.ref)) {
      form.acroForm.removeField(af); // single-widget field living on a removed page
    }
  }
  [...indexes].sort((a, b) => b - a).forEach((i) => doc.removePage(i));
}

export async function fillHopePdf(pdfBytes: ArrayBuffer | Uint8Array, data: ApplicationData): Promise<Uint8Array> {
  const plan = planFill(data);
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [name, value] of Object.entries(plan.text)) {
    try {
      const field = form.getTextField(name);
      field.setText(value);
      // Shrink text that would overflow its box (e.g. a long employer name in a narrow column).
      const width = Math.min(...field.acroField.getWidgets().map((w) => w.getRectangle().width)) - 4;
      const at10 = font.widthOfTextAtSize(value, 10);
      if (at10 > width) field.setFontSize(Math.max(6, Math.floor((10 * width) / at10)));
    } catch {
      // A renamed or missing field shouldn't break the download; the person can type it in.
    }
  }

  plan.extra4988Names.forEach((name, i) => {
    doc.getPage(PAGE.form4988Extra[i]).drawText(name, { ...NAME_BOX_4988, font });
  });

  const drop = [
    ...PAGE.partnerLetter,
    ...(plan.include2368 ? [] : PAGE.form2368),
    ...(plan.applicant4988 ? [] : [PAGE.form4988Applicant]),
    ...PAGE.form4988Extra.slice(plan.extra4988Names.length),
  ];
  removePages(doc, form, drop);

  // pdf-lib draws each field's appearance itself; NeedAppearances is left off so viewers don't redraw them.
  return doc.save();
}
