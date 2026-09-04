"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/*
 * The single place GSAP is imported and registered.
 *
 * This module is client-only: nothing here may run during server rendering.
 * Everything else in components/motion imports gsap and useGSAP from here, so
 * registration happens exactly once and no component can accidentally reach
 * for the raw package on the server.
 *
 * ScrollTrigger and SplitText are registered here too. They are used only by
 * the expressive layer (the mood board and, later, the landing page) — the
 * interview UI stays on the quiet primitives.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin);

export { gsap, ScrambleTextPlugin, ScrollTrigger, SplitText, useGSAP };
