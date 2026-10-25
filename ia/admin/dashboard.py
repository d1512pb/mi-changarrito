"""Shared dashboard facade with the same filters and scope as admin chat."""

from .chat import FILTER_KEYS, _validate_plan, scoped_metadata
from .security import check_action


def admin_dashboard(payload):
    from .analytics import dashboard

    if not isinstance(payload, dict):
        raise ValueError("El dashboard requiere un objeto JSON.")
    snapshot, authorization = payload.get("snapshot"), payload.get("authorization")
    metadata = scoped_metadata(snapshot, authorization)
    check_action("overview", authorization)
    filters = payload.get("filters", {})
    if not isinstance(filters, dict) or any(key not in FILTER_KEYS for key in filters):
        raise ValueError("Los filtros del dashboard no son válidos.")
    plan = {key: filters.get(key) for key in FILTER_KEYS}
    plan.update(action="overview", clarification=None, tianguis_ids=filters.get("tianguis_ids", []))
    plan = _validate_plan(plan, metadata, authorization)
    result = dashboard(snapshot, {key: plan[key] for key in FILTER_KEYS}, authorization)
    result.get("sections", {}).pop("map", None)
    result["deferred_features"] = [{"id": "tianguis_map", "audiences": ["buyer", "admin"], "status": "future_idea"}]
    return {"schema_version": "admin-dashboard-1.0", "read_only": True, "data": result}
