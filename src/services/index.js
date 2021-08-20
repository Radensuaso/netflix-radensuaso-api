import express from "express";
import fs from "fs-extra";
import { mediaJSONPath, reviewsJSONPath } from "../lib/paths.js";
import { mediaValidation, reviewsValidation } from "./validation.js";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import uniqid from "uniqid";
import { getMediaPDFReadableStream } from "../lib/pdfMakeTools.js";
import { pipeline } from "stream";
import multer from "multer";
import { savePosterCloudinary } from "../lib/cloudinaryTools.js";
import axios from "axios";

const {
  readJSON,
  writeJSON,
  writeFile,
  readFile,
  remove,
  createReadStream,
  createWriteStream,
} = fs;

const mediaRouter = express.Router(); // provide Routing

// ================ get all media =================

mediaRouter.get("/", async (req, res, next) => {
  try {
    const media = await readJSON(mediaJSONPath);
    const reviews = await readJSON(reviewsJSONPath);
    const reqQuery = req.query;

    if (reqQuery && reqQuery.Title) {
      const filteredMedia = media.filter((m) =>
        m.Title.toLocaleLowerCase().includes(reqQuery.Title.toLocaleLowerCase())
      );

      if (filteredMedia.length > 0) {
        res.send({ media: filteredMedia, reviews });
      } else {
        const omdbResponse = await axios.get(
          process.env.OMDB_URL + reqQuery.Title
        );
        const omdbData = omdbResponse.data;

        if (omdbData.Response === "True") {
          const omdbMedia = omdbData.Search;
          media.push(...omdbMedia);
          await writeJSON(mediaJSONPath, media);
          res.send(omdbMedia);
        } else {
          next(createHttpError(404, omdbData.Error));
        }
      }
    } else {
      res.send({ media, reviews });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// ================ get media by id media =================
mediaRouter.get("/:id", async (req, res, next) => {
  try {
    const paramsID = req.params.id;
    const media = await readJSON(mediaJSONPath);
    const singleMedia = media.find((m) => m.imdbID === paramsID);
    if (singleMedia) {
      const reviews = await readJSON(reviewsJSONPath);
      const singleMediaReviews = reviews.filter(
        (r) => r.elementId === paramsID
      );
      res.send({ singleMedia, singleMediaReviews });
    } else {
      res.send(
        createHttpError(404, `Media with the id: ${paramsID} not found.`)
      );
    }
  } catch (error) {
    next(error);
  }
});

// ================ post media =================
mediaRouter.post("/", mediaValidation, async (req, res, next) => {
  try {
    const errorList = validationResult(req);
    if (errorList.isEmpty()) {
      const reqBody = req.body;
      const media = await readJSON(mediaJSONPath);
      const newMedia = {
        Title: reqBody.Title,
        Year: reqBody.Year,
        imdbID: uniqid(),
        Type: reqBody.Type,
        Poster: "",
      };

      media.push(newMedia);
      await writeJSON(mediaJSONPath, media);

      res
        .status(201)
        .send({ newMedia, message: "New media was created with success!" });
    } else {
      next(createHttpError(400, { errorList }));
    }
  } catch (error) {
    next(error);
  }
});

// ================ post media Poster =================
mediaRouter.post(
  "/:id/poster",
  multer({ storage: savePosterCloudinary }).single("poster"),
  async (req, res, next) => {
    try {
      const paramsId = req.params.id;
      const media = await readJSON(mediaJSONPath);
      const singleMedia = media.find((m) => m.imdbID === paramsId);
      if (singleMedia) {
        const posterUrl = req.file.path;
        const updatedMedia = { ...singleMedia, Poster: posterUrl };
        const remainingMedia = media.filter((m) => m.imdbID !== paramsId);

        remainingMedia.push(updatedMedia);
        await writeJSON(mediaJSONPath, remainingMedia);
        res.send({
          updatedMedia,
          message: `It was added a Poster to the media with imdbID: ${singleMedia.imdbID}. `,
        });
      } else {
        next(
          createHttpError(
            404,
            `The media with the id: ${paramsId} was not found.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ================ update media =================
mediaRouter.put("/:id", mediaValidation, async (req, res, next) => {
  try {
    const errorList = validationResult(req);
    if (errorList.isEmpty()) {
      const paramsID = req.params.id;
      const media = await readJSON(mediaJSONPath);
      const singleMedia = media.find((m) => m.imdbID === paramsID);

      if (singleMedia) {
        const remainingMedia = media.filter((m) => m.imdbID !== paramsID);
        const updatedMedia = { ...singleMedia, ...req.body };

        remainingMedia.push(updatedMedia);
        await writeJSON(mediaJSONPath, remainingMedia);

        res.send({
          updatedMedia,
          message: `The media with imdbID: ${singleMedia.imdbID} was Updated. `,
        });
      } else {
        next(createHttpError(404, `Media with the id: ${paramsID} not found.`));
      }
    } else {
      next(createHttpError(400, { errorList }));
    }
  } catch (error) {
    next(error);
  }
});

// ================ delete media =================
mediaRouter.delete("/:id", async (req, res, next) => {
  try {
    const paramsID = req.params.id;
    const media = await readJSON(mediaJSONPath);
    const singleMedia = media.find((m) => m.imdbID === paramsID);
    if (singleMedia) {
      const remainingMedia = media.filter((m) => m.imdbID !== paramsID);

      await writeJSON(mediaJSONPath, remainingMedia);

      res.send({
        singleMedia,
        message: `The media with the id: ${singleMedia.imdbID} was deleted`,
      });
    } else {
      next(
        createHttpError(
          404,
          `The media with the imdbID: ${paramsID} was not found.`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});

// =============== download PDF ======================
mediaRouter.get("/:id/pdf", async (req, res, next) => {
  try {
    const paramsID = req.params.id;
    const media = await readJSON(mediaJSONPath);
    const singleMedia = media.find((m) => m.imdbID === paramsID);
    if (singleMedia) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${singleMedia.Title}.pdf`
      ); // this enables to download the pdf

      const reviews = await readJSON(reviewsJSONPath);
      const singleMediaReviews = reviews.filter(
        (r) => r.elementId === paramsID
      );

      const source = await getMediaPDFReadableStream(
        singleMedia,
        singleMediaReviews
      );
      const destination = res;

      pipeline(source, destination, (err) => {
        if (err) next(err);
      });
    } else {
      res.send(
        createHttpError(
          404,
          `The media with the imdbID: ${paramsID} not found.`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});

export default mediaRouter;
