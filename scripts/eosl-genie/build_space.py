"""Genie space definition for the EOSL app (serialized_space v2).

Usage: python3 build_space.py [CATALOG.SCHEMA] > space.json   (default: workspace.eosl)
IDs are derived from stable labels, so rebuilding yields the same space definition.
"""
import hashlib, json, sys

SCHEMA = sys.argv[1] if len(sys.argv) > 1 else "workspace.eosl"
V = f"{SCHEMA}.lineage_records"
R = f"{SCHEMA}.extended_support_rates"


def sid(label: str) -> str:
    return hashlib.md5(label.encode()).hexdigest()


def by_id(items):
    return sorted(items, key=lambda x: x["id"])


# Business vocabulary for the short column names of lineage_records.
COLUMNS = {
    "p": ("Product name, e.g. 'SQL Server 2016'.", ["product", "software", "operating system", "OS version", "platform"], True),
    "t": ("Product type: OS, Database, Software or Hardware.", ["product type", "category", "technology type"], True),
    "d": ("End-of-support-life (EoSL) date as YYYY-MM-DD; NULL when no date is recorded.", ["EoSL date", "end of support date", "end of life date", "support end date"], False),
    "sub": ("Sub-portfolio that owns the application.", ["sub-portfolio", "subportfolio", "portfolio", "team"], True),
    "bu": ("Business unit: Upstream, Midstream, Downstream, Digital or Corporate.", ["business unit", "BU", "division", "segment"], True),
    "own": ("Accountable owner of the sub-portfolio.", ["owner", "portfolio owner", "accountable owner", "lead"], True),
    "svc": ("Technical service the application belongs to.", ["technical service", "service", "platform service"], True),
    "app": ("Application that depends on the product.", ["application", "app", "system", "dependency"], True),
    "biz": ("Business service the application supports.", ["business service", "business capability", "business process"], True),
    "env": ("Environment: 'Production' or 'Non-prod'.", ["environment", "production", "non-production"], True),
    "cia": ("CIA (confidentiality, integrity, availability) criticality rating, E to H.", ["CIA rating", "criticality", "CIA"], False),
    "h": ("Number of assets (hosts, instances, installs or devices) on this product/application path. Always SUM this column; never count rows.", ["assets", "asset count", "hosts", "devices", "instances", "servers"], False),
    "days": ("Days from today until end of support; negative when support has already ended, NULL when there is no date.", ["days left", "days until end of support", "days to EoSL"], False),
}

column_configs = sorted(
    [
        {
            "column_name": name,
            "description": [desc],
            "synonyms": syns,
            **({"enable_format_assistance": True, "enable_entity_matching": True} if match else {}),
        }
        for name, (desc, syns, match) in COLUMNS.items()
    ],
    key=lambda c: c["column_name"],
)

rate_configs = [
    {"column_name": "annual_cost_per_asset_usd", "description": ["Extended-support cost per asset per year, in USD."], "synonyms": ["extended support rate", "cost per asset"]},
    {"column_name": "product_type", "description": ["Product type the rate applies to."], "enable_format_assistance": True, "enable_entity_matching": True},
]

SAMPLE_QUESTIONS = [
    "Which owners have the most assets to act on now?",
    "What turns Act now in the next 6 months if nothing changes?",
    "What is the yearly extended-support cost by owner?",
    "Which applications depend on SQL Server 2016?",
    "What should Fatima Okafor fix first?",
]

EXAMPLES = [
    ("Which owners have the most assets to act on now?",
     f"SELECT lineage_records.own AS owner, SUM(lineage_records.h) AS act_now_assets FROM {V} AS lineage_records WHERE lineage_records.days <= 90 GROUP BY lineage_records.own ORDER BY act_now_assets DESC",
     "Ranking owners by assets in one status today."),
    ("How does the status mix change if we look 6 months ahead?",
     f"SELECT CASE WHEN lineage_records.days IS NULL THEN 'No date' WHEN lineage_records.days - 6 * 30.4 <= 90 THEN 'Act now' WHEN lineage_records.days - 6 * 30.4 <= 365 THEN 'At risk' ELSE 'Supported' END AS status_in_6_months, SUM(lineage_records.h) AS assets FROM {V} AS lineage_records GROUP BY 1 ORDER BY assets DESC",
     "Projected status: subtract N x 30.4 days from days before applying the thresholds; replace 6 with the months asked for."),
    ("What is the yearly extended-support cost by owner?",
     f"SELECT lineage_records.own AS owner, ROUND(SUM(lineage_records.h * extended_support_rates.annual_cost_per_asset_usd), 0) AS extended_support_cost_usd_per_year FROM {V} AS lineage_records JOIN {R} AS extended_support_rates ON lineage_records.t = extended_support_rates.product_type WHERE lineage_records.days IS NULL OR lineage_records.days <= 365 GROUP BY lineage_records.own ORDER BY extended_support_cost_usd_per_year DESC",
     "Extended-support exposure counts every asset that is not Supported (Act now, At risk and No date)."),
    ("What should Fatima Okafor fix first?",
     f"SELECT lineage_records.app AS application, lineage_records.p AS product, lineage_records.biz AS business_service, SUM(lineage_records.h) AS production_assets FROM {V} AS lineage_records WHERE lineage_records.own = 'Fatima Okafor' AND lineage_records.env = 'Production' AND lineage_records.days <= 90 GROUP BY lineage_records.app, lineage_records.p, lineage_records.biz ORDER BY production_assets DESC LIMIT 5",
     "Fix first = the Act now application and product pair with the most production assets for an owner."),
    ("Which applications depend on SQL Server 2016?",
     f"SELECT lineage_records.app AS application, lineage_records.own AS owner, lineage_records.env AS environment, SUM(lineage_records.h) AS assets FROM {V} AS lineage_records WHERE lineage_records.p = 'SQL Server 2016' GROUP BY lineage_records.app, lineage_records.own, lineage_records.env ORDER BY assets DESC",
     "Tracing a product to the applications and owners that depend on it."),
    ("Which products reach end of support in the next 12 months?",
     f"SELECT lineage_records.p AS product, lineage_records.t AS product_type, lineage_records.d AS eosl_date, SUM(lineage_records.h) AS assets FROM {V} AS lineage_records WHERE lineage_records.days BETWEEN 0 AND 365 GROUP BY lineage_records.p, lineage_records.t, lineage_records.d ORDER BY eosl_date",
     "Time-window filter on days until end of support."),
]

TEXT_INSTRUCTIONS = """## PURPOSE
- Answer leadership questions about end-of-support-life (EoSL) risk across OS, database, software and hardware, by owner, sub-portfolio, application and product.
- Data is a synthetic demo estate; EoSL dates are approximate.

## DISAMBIGUATION
- Status names: Act now (red), At risk (amber), Supported (green), No date (grey). Use the matching status filters.
- "In N months", "projected" or "if nothing changes": subtract N x 30.4 from days before applying the status thresholds.
- "Assets", "hosts" or "devices" always means the sum of h, never a count of rows.
- "Cost", "exposure" or "extended support" means the extended-support cost per year for assets that are not Supported.

## Instructions you must follow when providing summaries
- Use the status names Act now, At risk, Supported and No date.
- Say whether figures are for today or projected, and for how many months.
- Round costs to whole US dollars."""

space = {
    "version": 2,
    "config": {"sample_questions": by_id([{"id": sid("sq:" + q), "question": [q]} for q in SAMPLE_QUESTIONS])},
    "data_sources": {
        "tables": sorted(
            [
                {"identifier": R, "column_configs": rate_configs},
                {"identifier": V, "column_configs": column_configs},
            ],
            key=lambda t: t["identifier"],
        )
    },
    "instructions": {
        "text_instructions": [{"id": sid("ti:main"), "content": [TEXT_INSTRUCTIONS]}],
        "example_question_sqls": by_id(
            [{"id": sid("ex:" + q), "question": [q], "sql": [s], "usage_guidance": [g]} for q, s, g in EXAMPLES]
        ),
        "join_specs": [
            {
                "id": sid("join:rates"),
                "left": {"identifier": V, "alias": "lineage_records"},
                "right": {"identifier": R, "alias": "extended_support_rates"},
                "sql": ["`lineage_records`.`t` = `extended_support_rates`.`product_type`", "--rt=FROM_RELATIONSHIP_TYPE_MANY_TO_ONE--"],
            }
        ],
        "sql_snippets": {
            "measures": by_id([
                {"id": sid("m:assets"), "alias": "total_assets", "display_name": "Assets", "sql": ["SUM(lineage_records.h)"], "synonyms": ["assets", "asset count", "hosts", "devices"]},
                {"id": sid("m:cost"), "alias": "extended_support_cost_usd", "display_name": "Extended-support cost per year (USD)", "sql": ["SUM(lineage_records.h * extended_support_rates.annual_cost_per_asset_usd)"], "synonyms": ["extended support cost", "exposure", "support cost"]},
            ]),
            "filters": by_id([
                {"id": sid("f:act_now"), "display_name": "Act now", "sql": ["lineage_records.days <= 90"], "synonyms": ["red", "out of support", "critical", "past EoSL", "act now"]},
                {"id": sid("f:at_risk"), "display_name": "At risk", "sql": ["lineage_records.days > 90 AND lineage_records.days <= 365"], "synonyms": ["amber", "at risk", "ending within 12 months"]},
                {"id": sid("f:supported"), "display_name": "Supported", "sql": ["lineage_records.days > 365"], "synonyms": ["green", "supported", "healthy"]},
                {"id": sid("f:no_date"), "display_name": "No date", "sql": ["lineage_records.days IS NULL"], "synonyms": ["grey", "unknown", "no EoSL date"]},
                {"id": sid("f:production"), "display_name": "Production", "sql": ["lineage_records.env = 'Production'"], "synonyms": ["prod", "production"]},
            ]),
            "expressions": by_id([
                {"id": sid("e:status"), "alias": "status_today", "display_name": "Status today", "sql": ["CASE WHEN lineage_records.days IS NULL THEN 'No date' WHEN lineage_records.days <= 90 THEN 'Act now' WHEN lineage_records.days <= 365 THEN 'At risk' ELSE 'Supported' END"]},
            ]),
        },
    },
}

print(json.dumps(space))
