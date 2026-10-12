"""Landscape Overview AI/BI dashboard (serialized_dashboard JSON) for the EOSL app.

Matches the Leadership prototype's Landscape Overview: four status tiles, red-asset trend,
FY26 remediation budget, risk by product type, top sub-portfolios by red assets and four
host/database tiles, with product-type and projected-status filters.
Usage: python3 build_dashboard.py > dashboard.json
"""
import json, sys
sys.path.insert(0, ".")
from datasets import STATUS, TREND, BUDGET, TILES

R, A, N, G = "#C80000", "#FF9A00", "#0089A8", "#007F00"
TX, MU, BD, AC = "#003600", "#004F00", "#CBF296", "#003600"
FONT = "'M PLUS Rounded 1c', 'BP Sans', system-ui, sans-serif"
LEAF = "M -1 0 A 1 1 0 0 1 0 -1 L 1 -1 L 1 0 A 1 1 0 0 1 0 1 L -1 1 Z"  # border-radius: 50% 0 50% 0
CONFIG = {"font": FONT, "view": {"stroke": None}, "autosize": {"type": "fit", "contains": "padding"}, "background": None}
SCHEMA = "https://vega.github.io/schema/vega-lite/v5.json"


def lines(sql):
    return [l + "\n" for l in sql.split("\n")]


def txt(x, y, size, color, weight=None, align="left", **enc):
    mark = {"type": "text", "align": align, "baseline": "top", "fontSize": size, "color": color}
    if weight:
        mark["fontWeight"] = weight
    e = {"x": {"value": x} if not isinstance(x, dict) else x, "y": {"value": y} if not isinstance(y, dict) else y}
    e.update(enc)
    return {"mark": mark, "encoding": e}


def leaf(color, x=10, y=12):
    m = {"type": "point", "shape": LEAF, "filled": True, "size": 400, "opacity": 1}
    e = {"x": {"value": x}, "y": {"value": y}}
    if isinstance(color, dict):
        e["color"] = color
    else:
        m["color"] = color
    return {"mark": m, "encoding": e}


def tile_spec(transform, number_color, line1, line2_field):
    """A prototype `.card.k`: leaf, big coloured number, two lines of text."""
    color_enc = number_color if isinstance(number_color, dict) else None
    num = txt(34, 0, 32, number_color if color_enc is None else TX, 800, text={"field": "value_txt"})
    if color_enc:
        num["encoding"]["color"] = color_enc
    l1 = txt(34, 42, 13, MU, text={"value": line1} if not line1.startswith("@") else {"field": line1[1:]})
    return {
        "$schema": SCHEMA, "width": "container", "height": "container",
        "data": {"name": "databricks_query"}, "transform": transform,
        "layer": [leaf(number_color), num, l1, txt(34, 61, 13, MU, text={"field": line2_field})],
        "config": CONFIG,
    }


def status_tile(rag, color, label):
    t = [
        {"calculate": f"datum.rag == '{rag}' ? datum.assets : 0", "as": "v"},
        {"aggregate": [{"op": "sum", "field": "v", "as": "value"}, {"op": "sum", "field": "assets", "as": "total"},
                       {"op": "max", "field": "projection_months", "as": "pm"}]},
        {"calculate": "format(datum.value, ',')", "as": "value_txt"},
        {"calculate": "(datum.total ? round(datum.value / datum.total * 100) : 0) + '% of ' + format(datum.total, ',') + ' assets' + (datum.pm > 0 ? ' (projected)' : '')", "as": "line2"},
    ]
    return tile_spec(t, color, label, "line2")


def category_tile(order):
    t = [
        {"filter": f"datum.tile_order == {order}"},
        {"calculate": "format(datum.assets, ',')", "as": "value_txt"},
        {"calculate": "format(datum.at_eosl, ',') + ' at EoSL, ' + format(datum.unknown, ',') + ' unknown.'", "as": "line2"},
    ]
    color = {"condition": {"test": "datum.at_eosl > 0", "value": R}, "value": G}
    return tile_spec(t, color, "@tile", "line2")


TREND_SPEC = {
    "$schema": SCHEMA, "width": "container", "height": "container", "data": {"name": "databricks_query"},
    "layer": [
        {   # header: red now, vs last month, vs a year ago
            "transform": [
                {"filter": "datum.series == 'current'"},
                {"aggregate": [{"op": "sum", "field": "red_assets", "as": "red"}], "groupby": ["month_index", "month_name"]},
                {"calculate": "datum.month_index == 12 ? datum.red : 0", "as": "now"},
                {"calculate": "datum.month_index == 11 ? datum.red : 0", "as": "prev"},
                {"calculate": "datum.month_index == 0 ? datum.red : 0", "as": "yago"},
                {"aggregate": [{"op": "sum", "field": "now", "as": "now"}, {"op": "sum", "field": "prev", "as": "prev"},
                               {"op": "sum", "field": "yago", "as": "yago"}, {"op": "argmin", "field": "month_index", "as": "first"}]},
                {"calculate": "datum.prev ? round((datum.now / datum.prev - 1) * 100) : 0", "as": "mom"},
                {"calculate": "datum.yago ? round((datum.now / datum.yago - 1) * 100) : 0", "as": "yoy"},
                {"calculate": "format(datum.now, ',')", "as": "now_txt"},
                {"calculate": "datum.mom + '%'", "as": "mom_txt"},
                {"calculate": "datum.yoy + '%'", "as": "yoy_txt"},
                {"calculate": "'vs ' + datum.first.month_name", "as": "yago_label"},
            ],
            "layer": [
                txt(0, 0, 24, TX, 800, text={"field": "now_txt"}),
                txt(0, 34, 13, MU, text={"value": "red now"}),
                {**txt(120, 0, 24, G, 800, text={"field": "mom_txt"}), },
                txt(120, 34, 13, MU, text={"value": "vs last month"}),
                txt(254, 0, 24, G, 800, text={"field": "yoy_txt"}),
                txt(254, 34, 13, MU, text={"field": "yago_label"}),
            ],
        },
        {   # lines, normalised to the current red count like the prototype (0 .. 2.2x)
            "transform": [
                {"aggregate": [{"op": "sum", "field": "red_assets", "as": "red"}], "groupby": ["series", "month_index", "month_label"]},
                {"calculate": "datum.series == 'current' && datum.month_index == 12 ? datum.red : 0", "as": "c"},
                {"joinaggregate": [{"op": "sum", "field": "c", "as": "rn"}]},
                {"calculate": "datum.rn ? datum.red / datum.rn : 0", "as": "v"},
            ],
            "encoding": {
                "x": {"field": "month_index", "type": "quantitative", "axis": None, "scale": {"domain": [0, 12], "range": [20, {"expr": "width - 20"}]}},
                "y": {"field": "v", "type": "quantitative", "axis": None, "scale": {"domain": [0, 2.2], "range": [{"expr": "height - 34"}, 96], "zero": True, "nice": False}},
            },
            "layer": [
                {"transform": [{"filter": "datum.series == 'previous'"}], "mark": {"type": "line", "color": N, "strokeWidth": 2, "strokeDash": [5, 4]}},
                {"transform": [{"filter": "datum.series == 'current'"}], "mark": {"type": "line", "color": R, "strokeWidth": 2.5}},
                *[{"transform": [{"filter": f"datum.series == 'current' && datum.month_index == {i}"}],
                   "mark": {"type": "text", "baseline": "bottom", "fontSize": 13, "color": TX, "align": al},
                   "encoding": {"y": {"value": {"expr": "height"}}, "text": {"field": "month_label"},
                                "x": {"field": "month_index", "type": "quantitative"}}}
                  for i, al in ((0, "left"), (6, "center"), (12, "right"))],
            ],
        },
        {**txt(24, 70, 13, TX, text={"value": "Solid: last 12 months. Dashed: previous 12 months."}), "data": {"values": [{}]}},
    ],
    "config": CONFIG,
}

BUDGET_SPEC = {
    "$schema": SCHEMA, "width": "container", "height": "container", "data": {"name": "databricks_query"},
    "transform": [
        {"aggregate": [{"op": "sum", "field": "budget_usd", "as": "B"}, {"op": "sum", "field": "spent_usd", "as": "S"},
                       {"op": "sum", "field": "committed_usd", "as": "C"}, {"op": "sum", "field": "forecast_usd", "as": "F"}]},
        {"calculate": "datum.B ? round((datum.F / datum.B - 1) * 100) : 0", "as": "ov"},
        {"calculate": "datum.F - datum.S - datum.C", "as": "T"},
        {"calculate": "max(datum.F, datum.B)", "as": "M"},
    ],
    "layer": [
        {"transform": [{"calculate": "'$' + format(datum.B / 1e6, '.1f') + 'M'", "as": "b_txt"},
                       {"calculate": "(datum.ov > 0 ? '+' : '') + datum.ov + '%'", "as": "ov_txt"},
                       {"calculate": "'Spent $' + format(datum.S / 1e6, '.1f') + 'M, committed $' + format(datum.C / 1e6, '.1f') + 'M, still to commit $' + format(datum.T / 1e6, '.1f') + 'M. Forecast is ' + (datum.ov > 0 ? 'over' : 'within') + ' budget.'", "as": "note"}],
         "layer": [
             txt(0, 0, 24, TX, 800, text={"field": "b_txt"}),
             txt(0, 34, 13, MU, text={"value": "budget"}),
             {**txt(126, 0, 24, R, 800, text={"field": "ov_txt"}),
              "encoding": {**txt(126, 0, 24, R, 800)["encoding"], "text": {"field": "ov_txt"},
                           "color": {"condition": {"test": "datum.ov > 0", "value": R}, "value": G}}},
             txt(126, 34, 13, MU, text={"value": "forecast vs budget"}),
             txt(0, 100, 13, MU, text={"field": "note"}),
         ]},
        {"transform": [
            {"fold": ["S", "C", "T"], "as": ["part", "amount"]},
            {"calculate": "datum.M ? datum.amount / datum.M : 0", "as": "frac"},
            {"calculate": "indexof(['S', 'C', 'T'], datum.part)", "as": "ord"},
            {"stack": "frac", "groupby": [], "sort": [{"field": "ord"}], "as": ["x0", "x1"]},
         ],
         "mark": {"type": "bar", "height": 14, "cornerRadius": 7, "stroke": "#FFFFFF", "strokeWidth": 2},
         "encoding": {
             "x": {"field": "x0", "type": "quantitative", "axis": None, "scale": {"domain": [0, 1], "range": [0, {"expr": "width"}]}},
             "x2": {"field": "x1"},
             "y": {"value": 70},
             "color": {"field": "part", "type": "nominal", "legend": None, "scale": {"domain": ["S", "C", "T"], "range": [G, AC, A]}},
             "tooltip": [{"field": "part", "title": "Part"}, {"field": "amount", "format": "$,.0f", "title": "Amount"}],
         }},
    ],
    "config": CONFIG,
}

ORDER_T = ["OS", "Database", "Software", "Hardware"]
ORDER_R = ["red", "amber", "grey", "green"]
RISK_SPEC = {
    "$schema": SCHEMA, "width": "container", "height": "container", "data": {"name": "databricks_query"},
    "transform": [
        {"aggregate": [{"op": "sum", "field": "assets", "as": "n"}], "groupby": ["product_type", "rag"]},
        {"joinaggregate": [{"op": "sum", "field": "n", "as": "total"}], "groupby": ["product_type"]},
        {"calculate": f"indexof({json.dumps(ORDER_T)}, datum.product_type)", "as": "row"},
        {"calculate": f"indexof({json.dumps(ORDER_R)}, datum.rag)", "as": "ord"},
        {"window": [{"op": "dense_rank", "as": "pos"}], "sort": [{"field": "row"}]},
    ],
    "encoding": {"y": {"field": "ypix", "type": "quantitative", "axis": None, "scale": {"domain": [0, 224], "range": [0, 224], "nice": False, "zero": False}}},
    "layer": [
        {"transform": [{"calculate": "(datum.pos - 1) * 56", "as": "ypix"},
                       {"aggregate": [{"op": "max", "field": "total", "as": "total"}], "groupby": ["product_type", "ypix"]},
                       {"calculate": "datum.product_type + ': ' + format(datum.total, ',') + ' assets'", "as": "label"}],
         "mark": {"type": "text", "align": "left", "baseline": "top", "fontSize": 13, "color": MU},
         "encoding": {"x": {"value": 0}, "text": {"field": "label"}}},
        {"transform": [{"calculate": "(datum.pos - 1) * 56 + 27", "as": "ypix"},
                       {"stack": "n", "groupby": ["product_type"], "sort": [{"field": "ord"}], "as": ["s0", "s1"], "offset": "normalize"}],
         "mark": {"type": "bar", "height": 14, "cornerRadius": 7, "stroke": "#FFFFFF", "strokeWidth": 2},
         "encoding": {
             "x": {"field": "s0", "type": "quantitative", "axis": None, "scale": {"domain": [0, 1], "range": [0, {"expr": "width"}]}},
             "x2": {"field": "s1"},
             "color": {"field": "rag", "type": "nominal", "legend": None, "scale": {"domain": ORDER_R, "range": [R, A, N, G]}},
             "tooltip": [{"field": "product_type", "title": "Type"}, {"field": "rag", "title": "Status"}, {"field": "n", "format": ",", "title": "Assets"}],
         }},
    ],
    "config": CONFIG,
}

TOP_SPEC = {
    "$schema": SCHEMA, "width": "container", "height": "container", "data": {"name": "databricks_query"},
    "transform": [
        {"filter": "datum.rag == 'red'"},
        {"aggregate": [{"op": "sum", "field": "assets", "as": "n"}], "groupby": ["sub_portfolio"]},
        {"window": [{"op": "row_number", "as": "rank"}], "sort": [{"field": "n", "order": "descending"}]},
        {"filter": "datum.rank <= 6"},
        {"joinaggregate": [{"op": "max", "field": "n", "as": "mx"}]},
        {"calculate": "datum.n / datum.mx", "as": "frac"},
        {"calculate": "format(datum.n, ',')", "as": "n_txt"},
        {"calculate": "0", "as": "zero"},
        {"calculate": "1", "as": "one"},
    ],
    "encoding": {
        "y": {"field": "rank", "type": "quantitative", "axis": None, "scale": {"domain": [0.5, 6.5], "range": [0, {"expr": "height"}], "nice": False, "zero": False}},
    },
    "layer": [
        {"mark": {"type": "text", "align": "left", "baseline": "middle", "fontSize": 13, "color": TX},
         "encoding": {"x": {"value": 4}, "text": {"field": "sub_portfolio"}}},
        {"mark": {"type": "bar", "height": 12, "cornerRadius": 6, "color": BD},
         "encoding": {"x": {"field": "zero", "type": "quantitative", "axis": None, "scale": {"domain": [0, 1], "range": [{"expr": "width * 0.4"}, {"expr": "width - 56"}]}},
                      "x2": {"field": "one"}}},
        {"mark": {"type": "bar", "height": 12, "cornerRadius": 6, "color": R},
         "encoding": {"x": {"field": "zero", "type": "quantitative"}, "x2": {"field": "frac"},
                      "tooltip": [{"field": "sub_portfolio", "title": "Sub-portfolio"}, {"field": "n", "format": ",", "title": "Red assets"}]}},
        {"mark": {"type": "text", "align": "right", "baseline": "middle", "fontSize": 13, "fontWeight": 700, "color": TX},
         "encoding": {"x": {"value": {"expr": "width - 4"}}, "text": {"field": "n_txt"}}},
    ],
    "config": CONFIG,
}

SPECS = {
    "kpi-red": status_tile("red", R, "Red: past EoSL or within 90 days"),
    "kpi-amber": status_tile("amber", A, "Amber: within 12 months"),
    "kpi-grey": status_tile("grey", N, "Grey: no EoSL date"),
    "kpi-green": status_tile("green", G, "Green: supported"),
    "red-trend": TREND_SPEC,
    "budget": BUDGET_SPEC,
    "risk-by-type": RISK_SPEC,
    "top-subportfolios": TOP_SPEC,
    "tile-host-app": category_tile(1),
    "tile-host-noapp": category_tile(2),
    "tile-host-noeosl": category_tile(3),
    "tile-database": category_tile(4),
}

DATASET_FIELDS = {
    "ds_status": ["projection", "projection_months", "product_type", "sub_portfolio", "rag", "assets"],
    "ds_trend": ["series", "month_index", "month_label", "month_name", "product_type", "red_assets"],
    "ds_budget": ["fiscal_year", "product_type", "budget_usd", "spent_usd", "committed_usd", "forecast_usd"],
    "ds_tiles": ["tile_order", "tile", "assets", "at_eosl", "unknown"],
}
WIDGET_DATASET = {
    "kpi-red": "ds_status", "kpi-amber": "ds_status", "kpi-grey": "ds_status", "kpi-green": "ds_status",
    "red-trend": "ds_trend", "budget": "ds_budget", "risk-by-type": "ds_status", "top-subportfolios": "ds_status",
    "tile-host-app": "ds_tiles", "tile-host-noapp": "ds_tiles", "tile-host-noeosl": "ds_tiles", "tile-database": "ds_tiles",
}
TITLES = {"red-trend": "Red assets trend", "budget": "Remediation budget (FY26)", "risk-by-type": "Risk by product type",
          "top-subportfolios": "Top sub-portfolios by red assets"}


def vega_widget(name, pos):
    ds = WIDGET_DATASET[name]
    fields = DATASET_FIELDS[ds]
    spec = {
        "version": 1, "widgetType": "custom-vega-viz",
        "jsonSpec": {"type": "vega-lite", "spec": json.dumps(SPECS[name])},
        "encodings": {"fields": [{"fieldName": f} for f in fields]},
        "data": {"queryName": "main_query"},
        "frame": {"showTitle": name in TITLES, "title": TITLES.get(name, "")},
    }
    return {"widget": {"name": name, "queries": [{"name": "main_query", "query": {
        "datasetName": ds, "fields": [{"name": f, "expression": f"`{f}`"} for f in fields], "disaggregated": True}}],
        "spec": spec}, "position": pos}


def filter_widget(name, title, field, datasets, default=None, order_field=None):
    queries, enc = [], []
    for ds in datasets:
        qn = f"{ds}_{field}"
        q = {"datasetName": ds, "fields": [{"name": field, "expression": f"`{field}`"}], "disaggregated": False}
        if order_field:
            q["fields"].append({"name": order_field, "expression": f"MIN(`{order_field}`)"})
            q["orders"] = [{"direction": "ASC", "expression": f"MIN(`{order_field}`)"}]
        queries.append({"name": qn, "query": q})
        enc.append({"fieldName": field, "displayName": title, "queryName": qn})
    spec = {"version": 2, "widgetType": "filter-single-select", "encodings": {"fields": enc}, "frame": {"showTitle": True, "title": title}}
    if default:
        spec["selection"] = {"defaultSelection": {"values": {"dataType": "STRING", "values": [{"value": default}]}}}
    return {"widget": {"name": name, "queries": queries, "spec": spec}}


def pos(x, y, w, h): return {"x": x, "y": y, "width": w, "height": h}


# No title widget: the dashboard name shows in Databricks, and the app page shows its own heading when embedded.
layout = [
    {**filter_widget("filter-product-type", "Product type", "product_type", ["ds_status", "ds_trend", "ds_budget"]), "position": pos(0, 0, 6, 2)},
    {**filter_widget("filter-projection", "Projected status", "projection", ["ds_status"], default="Today", order_field="projection_months"), "position": pos(6, 0, 6, 2)},
]
for i, n in enumerate(["kpi-red", "kpi-amber", "kpi-grey", "kpi-green"]):
    layout.append(vega_widget(n, pos(i * 3, 2, 3, 4)))
layout += [vega_widget("red-trend", pos(0, 6, 7, 8)), vega_widget("budget", pos(7, 6, 5, 8)),
           vega_widget("risk-by-type", pos(0, 14, 6, 7)), vega_widget("top-subportfolios", pos(6, 14, 6, 7))]
for i, n in enumerate(["tile-host-app", "tile-host-noapp", "tile-host-noeosl", "tile-database"]):
    layout.append(vega_widget(n, pos(i * 3, 21, 3, 4)))

dashboard = {
    "datasets": [
        {"name": "ds_status", "displayName": "Asset status by projection", "queryLines": lines(STATUS)},
        {"name": "ds_trend", "displayName": "Red assets trend", "queryLines": lines(TREND)},
        {"name": "ds_budget", "displayName": "Remediation budget", "queryLines": lines(BUDGET)},
        {"name": "ds_tiles", "displayName": "Host and database tiles", "queryLines": lines(TILES)},
    ],
    "pages": [{"name": "landscape", "displayName": "Landscape Overview", "pageType": "PAGE_TYPE_CANVAS", "layoutVersion": "GRID_V1", "layout": layout}],
    "uiSettings": {"theme": {
        "canvasBackgroundColor": {"light": "#FFFFFF", "dark": "#003600"},
        "widgetBackgroundColor": {"light": "#FFFFFF", "dark": "#003600"},
        "widgetBorderColor": {"light": BD, "dark": "#004F00"},
        "fontColor": {"light": TX, "dark": "#FFFFFF"},
        "selectionColor": {"light": AC, "dark": "#8EDF00"},
        "visualizationColors": [R, A, N, G, AC, "#8EDF00", "#FFE600"],
        "widgetHeaderAlignment": "LEFT",
        "widgetCornerRadius": 22,
    }},
}

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--specs":
        print(json.dumps(SPECS))
    else:
        print(json.dumps(dashboard))
