import express from "express";
import fs from "fs-extra";
import { mediaValidation, reviewsValidation } from "./validation.js";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import uniqid from "uniqid";
import { getMediaPDFReadableStream } from "../lib/pdfMakeTools.js";
import { pipeline } from "stream";
import multer from "multer";

const mediaRouter = express.Router(); // provide Routing

export default mediaRouter;
