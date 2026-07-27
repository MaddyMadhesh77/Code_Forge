import { Router } from "express";

import {
  idParam,
  joinInterviewBody,
  noteBody,
  paginationQuery,
  ratingBody,
  snapshotBody,
  startInterviewBody,
  updateSessionStatusBody,
} from "./schemas.js";
import type { AppModule } from "../../app.module.js";
import { currentUser } from "../../common/decorators/current-user.decorator.js";
import { asyncHandler } from "../../common/filters/global-exception.filter.js";
import { ForbiddenError } from "../../common/errors/app-error.js";
import { requireRoles } from "../../common/guards/roles.guard.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../common/pipes/zod-validation.pipe.js";

/**
 * Interview sessions and their artifacts (notes, scorecards, reports).
 *
 * Every route is authenticated and membership-checked; the previous version
 * exposed session detail, notes and ratings to any caller who knew an id.
 */
export function interviewsRoutes(app: AppModule): Router {
  const router = Router();
  const sessions = app.sessions.service;
  const artifacts = app.interviews.repository;
  const { jwt } = app.guards;

  // Everything below requires a valid access token.
  router.use(jwt.canActivate());

  router.post(
    "/",
    requireRoles("INTERVIEWER"),
    validateBody(startInterviewBody),
    asyncHandler(async (req, res) => {
      const actor = currentUser(req);
      const { problemId, title, mode, scheduledAt, participantIds } = req.body;

      const problem = await app.problems.repository.requireByIdOrSlug(problemId);

      const session = await sessions.createSession(actor.id, {
        title: title ?? `Interview (${mode})`,
        scheduledAt: scheduledAt ?? null,
        problemIds: [problem.id],
      });

      // The creator joins as the interviewer so membership checks pass for them.
      await sessions.joinSession(session.id, actor.id, "INTERVIEWER");

      for (const participantId of participantIds) {
        await sessions.joinSession(session.id, participantId, "CANDIDATE");
      }

      res.status(201).json({
        sessionId: session.id,
        joinUrl: `/sessions/${session.id}`,
        session: await sessions.getSession(actor, session.id),
      });
    }),
  );

  router.get(
    "/",
    validateQuery(paginationQuery),
    asyncHandler(async (req, res) => {
      const actor = currentUser(req);
      const { limit, offset } = req.query as never;

      // Non-admins only ever see sessions they belong to.
      const page = await sessions.listSessions({
        limit,
        offset,
        ...(actor.role === "ADMIN" ? {} : { viewerId: actor.id }),
      });

      res.paginated(page.items, { total: page.total, limit: page.limit, offset: page.offset });
    }),
  );

  router.get(
    "/:id",
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      res.json(await sessions.getSession(currentUser(req), req.params.id));
    }),
  );

  router.post(
    "/:id/join",
    validateParams(idParam),
    validateBody(joinInterviewBody),
    asyncHandler(async (req, res) => {
      const actor = currentUser(req);

      // A caller joins as themselves; the role they may claim is constrained
      // by their account role, so a candidate cannot join as an interviewer.
      const role =
        actor.role === "CANDIDATE" && req.body.role !== "CANDIDATE" ? "CANDIDATE" : req.body.role;

      const participant = await sessions.joinSession(req.params.id, actor.id, role);
      res.status(201).json(participant);
    }),
  );

  router.patch(
    "/:id/status",
    validateParams(idParam),
    validateBody(updateSessionStatusBody),
    asyncHandler(async (req, res) => {
      res.json(await sessions.updateStatus(currentUser(req), req.params.id, req.body.status));
    }),
  );

  router.put(
    "/:id/snapshot",
    validateParams(idParam),
    validateBody(snapshotBody),
    asyncHandler(async (req, res) => {
      await sessions.saveSnapshot(currentUser(req), req.params.id, req.body.snapshot);
      res.status(204).end();
    }),
  );

  // --- Notes ------------------------------------------------------------

  router.post(
    "/:id/notes",
    validateParams(idParam),
    validateBody(noteBody),
    asyncHandler(async (req, res) => {
      const actor = await requireMember(app, req.params.id, req);
      const note = await artifacts.addNote({
        sessionId: req.params.id,
        authorId: actor.id,
        body: req.body.note,
      });

      res.status(201).json(note);
    }),
  );

  router.get(
    "/:id/notes",
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      await requireMember(app, req.params.id, req);
      res.json(await artifacts.listNotes(req.params.id));
    }),
  );

  // --- Scorecards -------------------------------------------------------

  router.post(
    "/:id/ratings",
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    validateBody(ratingBody),
    asyncHandler(async (req, res) => {
      const actor = await requireMember(app, req.params.id, req);
      const scorecard = await artifacts.upsertScorecard({
        sessionId: req.params.id,
        authorId: actor.id,
        scores: req.body.scores,
        overall: req.body.overall,
        recommendation: req.body.recommendation,
        feedback: req.body.feedback,
      });

      res.status(201).json(scorecard);
    }),
  );

  // Candidates must not read the panel's assessment of them.
  router.get(
    "/:id/ratings",
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      await requireMember(app, req.params.id, req);
      res.json(await artifacts.listScorecards(req.params.id));
    }),
  );

  // --- Reports ----------------------------------------------------------

  router.post(
    "/:id/report",
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      const actor = currentUser(req);
      const session = await sessions.getSession(actor, req.params.id);
      const scorecards = await artifacts.listScorecards(session.id);

      const report = await artifacts.upsertReport({
        sessionId: session.id,
        summary: `Interview report for ${session.title}`,
        content: {
          session: { id: session.id, title: session.title, status: session.status },
          scorecards,
          notes: await artifacts.listNotes(session.id),
        },
      });

      res.status(201).json(report);
    }),
  );

  router.get(
    "/:id/report",
    requireRoles("INTERVIEWER"),
    validateParams(idParam),
    asyncHandler(async (req, res) => {
      await sessions.getSession(currentUser(req), req.params.id);
      res.json(await artifacts.getReport(req.params.id));
    }),
  );

  return router;
}

/**
 * Confirms the caller belongs to the session before letting them read or write
 * its artifacts, and returns the principal.
 */
async function requireMember(
  app: AppModule,
  sessionId: string,
  req: Parameters<typeof currentUser>[0],
) {
  const actor = currentUser(req);

  if (actor.role !== "ADMIN" && !(await app.sessions.service.isMember(sessionId, actor.id))) {
    throw new ForbiddenError("You are not a participant in this session");
  }

  return actor;
}
