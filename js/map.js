
(() => {
    "use strict";

    const canvas = document.getElementById("map-renderer");
    const host = document.getElementById("interactive-map");
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d", { alpha: false });

    const $ = (id) => document.getElementById(id);
    const statusEl = $("map-status");
    const coordEl = $("map-coordinates");
    const hintEl = $("map-hint");
    const finishBtn = $("finish-drawing");
    const undoBtn = $("undo-drawing");
    const toolNote = $("tool-note");

    const CENTER = { lon: -74.1724, lat: 40.7357 };
    const INITIAL_SPAN_LON = 0.13;
    const INITIAL_SPAN_LAT = 0.14;
    const MAX_FEATURES = 1500;
    const COLORS = {
        background: "#e9efea",
        block: "#e2e9e1",
        blockEdge: "#d2ddd1",
        building: "#f5c8a6",
        buildingEdge: "#d49b78",
        park: "#bfe8c9",
        parkEdge: "#73bd8a",
        water: "#b7dff3",
        waterEdge: "#7dbedc",
        roadCasing: "#fffdf7",
        road: "#f4c48b",
        roadMinor: "#fff8e9",
        roadMajor: "#f2a56c",
        highway: "#ee8e5c",
        draftRoad: "#ffd84d",
        problem: "#ff815f",
        area: "#75bdf4",
        ink: "#171717"
    };

    const state = {
        width: 0, height: 0, dpr: 1,
        centerLon: CENTER.lon, centerLat: CENTER.lat,
        spanLon: INITIAL_SPAN_LON, spanLat: INITIAL_SPAN_LAT,
        tool: "select",
        layers: { roads: true, buildings: true, parks: true },
        features: { roads: [], buildings: [], parks_water: [], waterways: [] },
        drafts: { problems: [], roads: [], areas: [] },
        drawing: [],
        drag: null,
        lastPointer: null,
        requestId: 0,
        requestTimer: null,
        fetchController: null,
        featureCounts: null,
        analyses: 0,
        activity: []
    };

    const supabase = window.supabaseClient
    const hasRpc = !!(supabase && typeof supabase.rpc === "function");

    function setStatus(message) {
        if (statusEl) statusEl.textContent = message;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function mercatorY(lat) {
        const rad = clamp(lat, -85, 85) * Math.PI / 180;
        return Math.log(Math.tan(Math.PI / 4 + rad / 2));
    }

    function inverseMercatorY(y) {
        return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
    }

    function mapToScreen(lon, lat) {
        const centerY = mercatorY(state.centerLat);
        const worldY = mercatorY(lat);
        return {
            x: (lon - state.centerLon) / state.spanLon * state.width + state.width / 2,
            y: (centerY - worldY) / (state.spanLat / Math.max(0.2, Math.cos(state.centerLat * Math.PI / 180))) * state.height + state.height / 2
        };
    }

    function screenToMap(x, y) {
        const lon = state.centerLon + ((x - state.width / 2) / state.width) * state.spanLon;
        const yScale = state.spanLat / Math.max(0.2, Math.cos(state.centerLat * Math.PI / 180));
        const mercY = mercatorY(state.centerLat) - ((y - state.height / 2) / state.height) * yScale;
        return { lon, lat: inverseMercatorY(mercY) };
    }

    function currentBounds() {
        const nw = screenToMap(0, 0);
        const se = screenToMap(state.width, state.height);
        return {
            min_lon: Math.min(nw.lon, se.lon),
            min_lat: Math.min(nw.lat, se.lat),
            max_lon: Math.max(nw.lon, se.lon),
            max_lat: Math.max(nw.lat, se.lat)
        };
    }

    function resizeCanvas() {
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        state.width = rect.width;
        state.height = rect.height;
        state.dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(rect.width * state.dpr);
        canvas.height = Math.round(rect.height * state.dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        draw();
    }

    function featureCoordinates(geometry) {
        if (!geometry) return [];
        const type = geometry.type;
        const c = geometry.coordinates;
        if (type === "Point") return [c];
        if (type === "MultiPoint" || type === "LineString") return [c];
        if (type === "MultiLineString" || type === "Polygon") return c;
        if (type === "MultiPolygon") return c.flat();
        if (type === "GeometryCollection") return (geometry.geometries || []).flatMap(featureCoordinates);
        return [];
    }

    function pathCoordinates(coords, close = false) {
        if (!coords || coords.length === 0) return;
        let started = false;
        for (const point of coords) {
            if (!Array.isArray(point) || point.length < 2) continue;
            const p = mapToScreen(point[0], point[1]);
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
        }
        if (close && started) ctx.closePath();
    }

    function drawPolygonFeature(feature, fill, stroke) {
        const geom = feature.geometry;
        if (!geom) return;
        const polygons = geom.type === "Polygon" ? [geom.coordinates] :
            geom.type === "MultiPolygon" ? geom.coordinates : [];
        for (const polygon of polygons) {
            ctx.beginPath();
            for (const ring of polygon) pathCoordinates(ring, true);
            ctx.fillStyle = fill;
            ctx.fill("evenodd");
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.7; ctx.stroke(); }
        }
    }

    function drawLineFeature(feature, color, width, casing = null) {
        const geom = feature.geometry;
        if (!geom) return;
        const lines = geom.type === "LineString" ? [geom.coordinates] :
            geom.type === "MultiLineString" ? geom.coordinates : [];
        for (const line of lines) {
            ctx.beginPath();
            pathCoordinates(line, false);
            if (casing) {
                ctx.strokeStyle = casing;
                ctx.lineWidth = width + 2;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.stroke();
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
        }
    }

    function roadStyle(feature) {
        const p = feature.properties || {};
        const type = String(p.highway || "");
        if (["motorway", "motorway_link", "trunk", "trunk_link"].includes(type)) return { color: COLORS.highway, width: 3.2 };
        if (["primary", "primary_link", "secondary", "secondary_link"].includes(type)) return { color: COLORS.roadMajor, width: 2.3 };
        if (["tertiary", "tertiary_link", "residential", "unclassified"].includes(type)) return { color: COLORS.road, width: 1.35 };
        return { color: COLORS.roadMinor, width: 0.85 };
    }

    function drawGrid() {
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, state.width, state.height);

        const step = 34;
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#d3ddd2";
        ctx.lineWidth = 1;
        for (let x = (state.width / 2) % step; x < state.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, state.height); ctx.stroke();
        }
        for (let y = (state.height / 2) % step; y < state.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(state.width, y); ctx.stroke();
        }
        ctx.restore();
    }

    function draw() {
        if (!state.width || !state.height) return;
        drawGrid();

        // Parks and water first, beneath buildings and roads.
        if (state.layers.parks) {
            for (const f of state.features.parks_water) {
                const p = f.properties || {};
                const isWater = p.natural === "water" || p.waterway || p.landuse === "reservoir";
                drawPolygonFeature(f, isWater ? COLORS.water : COLORS.park, isWater ? COLORS.waterEdge : COLORS.parkEdge);
            }
            for (const f of state.features.waterways) drawLineFeature(f, COLORS.waterEdge, 2.1);
        }

        if (state.layers.buildings) {
            for (const f of state.features.buildings) drawPolygonFeature(f, COLORS.building, COLORS.buildingEdge);
        }

        if (state.layers.roads) {
            // Draw small roads first; major roads on top.
            const sorted = [...state.features.roads].sort((a, b) => {
                const rank = (f) => {
                    const h = (f.properties || {}).highway || "";
                    if (["motorway", "trunk", "primary", "secondary"].includes(h)) return 1;
                    return 0;
                };
                return rank(a) - rank(b);
            });
            for (const f of sorted) {
                const s = roadStyle(f);
                drawLineFeature(f, s.color, s.width, COLORS.roadCasing);
            }
        }

        drawDrafts();
    }

    function drawDrafts() {
        // Reports
        for (const problem of state.drafts.problems) {
            const p = mapToScreen(problem.lon, problem.lat);
            ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.problem; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = COLORS.ink; ctx.stroke();
            ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,129,95,.45)"; ctx.lineWidth = 2; ctx.stroke();
        }

        for (const road of state.drafts.roads) {
            if (road.points.length < 2) continue;
            ctx.beginPath();
            road.points.forEach((pt, i) => {
                const p = mapToScreen(pt.lon, pt.lat);
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
            ctx.strokeStyle = COLORS.draftRoad; ctx.lineWidth = 3.5; ctx.stroke();
        }

        for (const area of state.drafts.areas) {
            if (!area.points.length) continue;
            ctx.beginPath();
            area.points.forEach((pt, i) => {
                const p = mapToScreen(pt.lon, pt.lat);
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            if (area.points.length >= 3) ctx.closePath();
            ctx.fillStyle = "rgba(117,189,244,.28)"; ctx.fill();
            ctx.strokeStyle = "#3b86c2"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
        }

        if (state.drawing.length) {
            ctx.beginPath();
            state.drawing.forEach((pt, i) => {
                const p = mapToScreen(pt.lon, pt.lat);
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            if (state.tool === "area" && state.drawing.length >= 3) ctx.closePath();
            ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
            ctx.strokeStyle = state.tool === "road" ? COLORS.draftRoad : COLORS.area;
            ctx.lineWidth = 3.5; ctx.setLineDash(state.tool === "area" ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
            for (const pt of state.drawing) {
                const p = mapToScreen(pt.lon, pt.lat);
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = COLORS.paper || "#fff"; ctx.fill(); ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.5; ctx.stroke();
            }
        }
    }

    function updateCoordinateReadout(point) {
        if (!coordEl) return;
        const lat = point ? point.lat : state.centerLat;
        const lon = point ? point.lon : state.centerLon;
        coordEl.textContent = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? "E" : "W"}`;
    }

    function updateStats() {
        const problemCount = state.drafts.problems.length;
        $("problem-count").textContent = String(problemCount);
        $("analysis-count").textContent = String(state.analyses);
        const total = problemCount + state.drafts.roads.length + state.drafts.areas.length;
        const progress = Math.min(100, total * 10);
        $("progress-label").textContent = `${progress}%`;
        $("progress-value").style.width = `${progress}%`;
    }

    function addActivity(title, detail) {
        state.activity.unshift({ title, detail });
        state.activity = state.activity.slice(0, 5);
        const list = $("activity-list");
        list.replaceChildren();
        state.activity.forEach(item => {
            const row = document.createElement("div"); row.className = "activity";
            const marker = document.createElement("span"); marker.className = "activity-marker";
            const content = document.createElement("div");
            const strong = document.createElement("strong"); strong.textContent = item.title;
            const small = document.createElement("small"); small.textContent = item.detail;
            content.append(strong, small); row.append(marker, content); list.append(row);
        });
    }

    function setTool(tool) {
        state.tool = tool;
        state.drawing = [];
        document.querySelectorAll("[data-tool]").forEach(button => {
            const active = button.dataset.tool === tool;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });
        const messages = {
            select: "Select / Pan: drag to move around the map.",
            problem: "Add Problem: click the map where you see an issue.",
            road: "Create Road: click to add points, then choose Finish drawing.",
            area: "Add Area: click at least three points, then choose Finish drawing."
        };
        toolNote.textContent = messages[tool] || messages.select;
        hintEl.textContent = messages[tool] || "Drag to pan · Use + / − to zoom";
        canvas.classList.toggle("tool-draw", tool !== "select");
        finishBtn.hidden = !["road", "area"].includes(tool);
        undoBtn.hidden = !["road", "area"].includes(tool);
        draw();
    }

    function finishDrawing() {
        if (state.tool === "road" && state.drawing.length >= 2) {
            state.drafts.roads.push({ points: state.drawing.map(p => ({ ...p })) });
            addActivity("Road draft created", `${state.drawing.length} points · not saved to the server`);
        } else if (state.tool === "area" && state.drawing.length >= 3) {
            state.drafts.areas.push({ points: state.drawing.map(p => ({ ...p })) });
            addActivity("Area draft created", `${state.drawing.length} points · not saved to the server`);
        } else {
            setStatus(state.tool === "area" ? "An area needs at least 3 points." : "A road needs at least 2 points.");
            return;
        }
        state.drawing = [];
        updateStats();
        draw();
        setStatus("Draft added to this session. Saving is not connected yet.");
    }

    function undoPoint() {
        state.drawing.pop();
        draw();
    }

    function zoomAt(factor, x = state.width / 2, y = state.height / 2) {
        const before = screenToMap(x, y);
        state.spanLon = clamp(state.spanLon / factor, 0.002, 4);
        state.spanLat = clamp(state.spanLat / factor, 0.002, 3);
        const after = screenToMap(x, y);
        state.centerLon += before.lon - after.lon;
        state.centerLat += before.lat - after.lat;
        draw();
        updateCoordinateReadout();
        scheduleFetch();
    }

    function resetView() {
        state.centerLon = CENTER.lon;
        state.centerLat = CENTER.lat;
        state.spanLon = INITIAL_SPAN_LON;
        state.spanLat = INITIAL_SPAN_LAT;
        draw();
        updateCoordinateReadout();
        scheduleFetch();
    }

    function pointerPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onPointerDown(event) {
        if (event.button !== 0 && event.pointerType !== "touch") return;
        const pos = pointerPosition(event);
        if (state.tool === "select") {
            state.drag = { x: pos.x, y: pos.y, centerLon: state.centerLon, centerLat: state.centerLat, moved: false };
            canvas.setPointerCapture?.(event.pointerId);
            canvas.classList.add("is-dragging");
        }
        state.lastPointer = pos;
    }

    function onPointerMove(event) {
        const pos = pointerPosition(event);
        if (state.drag && state.tool === "select") {
            const dx = pos.x - state.drag.x;
            const dy = pos.y - state.drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) state.drag.moved = true;
            state.centerLon = state.drag.centerLon - dx / state.width * state.spanLon;
            const yScale = state.spanLat / Math.max(0.2, Math.cos(state.centerLat * Math.PI / 180));
            const centerY = mercatorY(state.drag.centerLat) + dy / state.height * yScale;
            state.centerLat = clamp(inverseMercatorY(centerY), -84, 84);
            draw();
            updateCoordinateReadout();
        }
        state.lastPointer = pos;
    }

    function onPointerUp(event) {
        if (state.drag) {
            const moved = state.drag.moved;
            state.drag = null;
            canvas.classList.remove("is-dragging");
            if (moved) scheduleFetch();
            return;
        }
        if (state.tool === "select") return;
        const pos = pointerPosition(event);
        const point = screenToMap(pos.x, pos.y);
        if (state.tool === "problem") {
            state.drafts.problems.push(point);
            addActivity("Problem marker added", `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)} · local draft`);
            updateStats(); draw();
            setStatus("Problem marked locally. Saving is not connected yet.");
        } else if (state.tool === "road" || state.tool === "area") {
            state.drawing.push(point);
            draw();
            setStatus(`${state.drawing.length} point${state.drawing.length === 1 ? "" : "s"} added.`);
        }
        updateCoordinateReadout(point);
    }

    function scheduleFetch() {
        if (state.requestTimer) clearTimeout(state.requestTimer);
        state.requestTimer = setTimeout(fetchFeatures, 280);
    }

    async function fetchFeatures() {
        if (!hasRpc) {
            setStatus("Canvas ready · configure window.supabaseClient to load map data.");
            draw();
            return;
        }

        const bounds = currentBounds();
        if (bounds.max_lon - bounds.min_lon > 0.5 || bounds.max_lat - bounds.min_lat > 0.5) {
            setStatus("Zoom in to load detailed map features.");
            return;
        }

        const requestId = ++state.requestId;
        if (state.fetchController) state.fetchController.abort();
        state.fetchController = new AbortController();
        setStatus("Loading real map features…");

        try {
            const { data, error } = await supabase.rpc("get_map_features", {
                min_lon: bounds.min_lon,
                min_lat: bounds.min_lat,
                max_lon: bounds.max_lon,
                max_lat: bounds.max_lat,
                max_features: MAX_FEATURES
            });
            if (requestId !== state.requestId) return;
            if (error) throw error;
            if (!data || typeof data !== "object") throw new Error("The map RPC returned no feature data.");

            state.features.roads = data.roads || [];
            state.features.buildings = data.buildings || [];
            state.features.parks_water = data.parks_water || [];
            state.features.waterways = data.waterways || [];
            state.featureCounts = {
                roads: state.features.roads.length,
                buildings: state.features.buildings.length,
                parks: state.features.parks_water.length,
                waterways: state.features.waterways.length
            };
            draw();
            const total = Object.values(state.featureCounts).reduce((sum, count) => sum + count, 0);
            const capped = Object.values(state.featureCounts).some(count => count >= MAX_FEATURES);
            setStatus(`${total.toLocaleString()} features loaded${capped ? " · zoom in for more detail" : ""}`);
        } catch (error) {
            if (error && error.name === "AbortError") return;
            console.error("CivicLens map feature request failed:", error);
            setStatus("Could not load map data. Check Supabase connection and RPC permissions.");
        }
    }

    function wireLayers() {
        $("toggle-roads").addEventListener("change", event => { state.layers.roads = event.target.checked; draw(); });
        $("toggle-buildings").addEventListener("change", event => { state.layers.buildings = event.target.checked; draw(); });
        $("toggle-parks").addEventListener("change", event => { state.layers.parks = event.target.checked; draw(); });
    }

    function wireTools() {
        document.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => setTool(button.dataset.tool)));
        document.querySelectorAll("[data-select-tool]").forEach(button => button.addEventListener("click", () => setTool(button.dataset.selectTool)));
        finishBtn.addEventListener("click", finishDrawing);
        undoBtn.addEventListener("click", undoPoint);
        $("zoom-in").addEventListener("click", () => zoomAt(1.35));
        $("zoom-out").addEventListener("click", () => zoomAt(1 / 1.35));
        $("reset-map").addEventListener("click", resetView);
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("wheel", event => {
            event.preventDefault();
            const pos = pointerPosition(event);
            zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, pos.x, pos.y);
        }, { passive: false });
        $("ai-analyze").addEventListener("click", () => {
            state.analyses += 1; updateStats();
            setStatus("AI analysis is not connected yet.");
            addActivity("Analysis requested", "AI analysis integration is not connected yet");
        });
        $("sidebar-ai").addEventListener("click", () => $("ai-analyze").click());
    }

    function wireModal() {
        const modal = $("statsModal");
        const close = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); };
        $("openStats").addEventListener("click", () => { modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); });
        $("closeStats").addEventListener("click", close);
        modal.querySelector(".stats-modal-backdrop").addEventListener("click", close);
        document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    }

    function init() {
        resizeCanvas();
        wireLayers();
        wireTools();
        wireModal();
        updateCoordinateReadout();
        updateStats();
        if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(host);
        else window.addEventListener("resize", resizeCanvas);
        if (hasRpc) fetchFeatures();
        else {
            draw();
            setStatus("Canvas ready · Supabase client not detected.");
            console.warn("CivicLens map: expose your configured Supabase client as window.supabaseClient before loading js/map.js.");
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
