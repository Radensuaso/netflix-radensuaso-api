import PdfPrinter from "pdfmake";
import ImageDataURI from "image-data-uri";

const turnToBase64Format = async (url) => {
  const urlBase64 = await ImageDataURI.encodeFromURL(url);
  return urlBase64;
};

const fonts = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

export const getMediaPDFReadableStream = async (media) => {
  const printer = new PdfPrinter(fonts);
  const base64Image = await turnToBase64Format(media.cover);

  const docDefinition = {
    content: [
      { image: base64Image, width: 510 },
      "\n\n\n",
      {
        text: media.title,
        style: "header",
      },
      "\n\n\n",
      media.content,
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
    },
  };
  const pdfReadableStream = printer.createPdfKitDocument(docDefinition);

  pdfReadableStream.end();
  return pdfReadableStream;
};
