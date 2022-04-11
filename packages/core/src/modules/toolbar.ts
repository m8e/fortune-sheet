import _, { isPlainObject } from "lodash";
import { Context, getFlowdata } from "../context";
// import { locale } from "../locale";
import { Cell, CellMatrix, GlobalCache } from "../types";
import { getSheetIndex } from "../utils";
import {
  getRangetxt,
  isAllSelectedCellsInStatus,
  normalizedAttr,
  setCellValue,
} from "./cell";
import { colors } from "./color";
import { genarate, is_date, update } from "./format";
import {
  execfunction,
  execFunctionGroup,
  formulaCache,
  israngeseleciton,
  rangeSetValue,
  setCaretPosition,
} from "./formula";
import {
  isInlineStringCT,
  updateInlineStringFormatOutside,
} from "./inline-string";
import { colLocationByIndex, rowLocationByIndex } from "./location";
import { selectionCopyShow } from "./selection";
import {
  hasPartMC,
  isdatatypemulti,
  isRealNull,
  isRealNum,
} from "./validation";

type ToolbarItemClickHandler = (
  ctx: Context,
  cellInput: HTMLDivElement,
  cache?: GlobalCache
) => void;

function updateFormatCell(
  ctx: Context,
  d: CellMatrix,
  attr: keyof Cell,
  foucsStatus: any,
  row_st: number,
  row_ed: number,
  col_st: number,
  col_ed: number
) {
  if (_.isNil(d) || _.isNil(attr)) {
    return;
  }
  if (attr === "ct") {
    for (let r = row_st; r <= row_ed; r += 1) {
      if (!_.isNil(ctx.config.rowhidden) && !_.isNil(ctx.config.rowhidden[r])) {
        continue;
      }

      for (let c = col_st; c <= col_ed; c += 1) {
        const cell = d[r][c];
        let value;

        if (_.isPlainObject(cell)) {
          value = cell?.v;
        } else {
          value = cell;
        }

        if (foucsStatus !== "@" && isRealNum(value)) {
          value = Number(value!);
        }

        const mask = update(foucsStatus, value);
        let type = "n";

        if (
          is_date(foucsStatus) ||
          foucsStatus === 14 ||
          foucsStatus === 15 ||
          foucsStatus === 16 ||
          foucsStatus === 17 ||
          foucsStatus === 18 ||
          foucsStatus === 19 ||
          foucsStatus === 20 ||
          foucsStatus === 21 ||
          foucsStatus === 22 ||
          foucsStatus === 45 ||
          foucsStatus === 46 ||
          foucsStatus === 47
        ) {
          type = "d";
        } else if (foucsStatus === "@" || foucsStatus === 49) {
          type = "s";
        } else if (foucsStatus === "General" || foucsStatus === 0) {
          // type = "g";
          type = isRealNum(value) ? "n" : "g";
        }

        if (cell && _.isPlainObject(cell)) {
          cell.m = mask;
          if (_.isNil(cell.ct)) {
            cell.ct = {};
          }
          cell.ct.fa = foucsStatus;
          cell.ct.t = type;
        } else {
          d[r][c] = {
            ct: { fa: foucsStatus, t: type },
            v: value as string,
            m: mask,
          };
        }
      }
    }
  } else {
    if (attr === "ht") {
      if (foucsStatus === "left") {
        foucsStatus = "1";
      } else if (foucsStatus === "center") {
        foucsStatus = "0";
      } else if (foucsStatus === "right") {
        foucsStatus = "2";
      }
    } else if (attr === "vt") {
      if (foucsStatus === "top") {
        foucsStatus = "1";
      } else if (foucsStatus === "middle") {
        foucsStatus = "0";
      } else if (foucsStatus === "bottom") {
        foucsStatus = "2";
      }
    } else if (attr === "tb") {
      if (foucsStatus === "overflow") {
        foucsStatus = "1";
      } else if (foucsStatus === "clip") {
        foucsStatus = "0";
      } else if (foucsStatus === "wrap") {
        foucsStatus = "2";
      }
    } else if (attr === "tr") {
      if (foucsStatus === "none") {
        foucsStatus = "0";
      } else if (foucsStatus === "angleup") {
        foucsStatus = "1";
      } else if (foucsStatus === "angledown") {
        foucsStatus = "2";
      } else if (foucsStatus === "vertical") {
        foucsStatus = "3";
      } else if (foucsStatus === "rotation-up") {
        foucsStatus = "4";
      } else if (foucsStatus === "rotation-down") {
        foucsStatus = "5";
      }
    }

    for (let r = row_st; r <= row_ed; r += 1) {
      if (!_.isNil(ctx.config.rowhidden) && !_.isNil(ctx.config.rowhidden[r])) {
        continue;
      }

      for (let c = col_st; c <= col_ed; c += 1) {
        const value = d[r][c];

        if (value && _.isPlainObject(value)) {
          // if(attr in inlineStyleAffectAttribute && isInlineStringCell(value)){
          updateInlineStringFormatOutside(value!, attr, foucsStatus);
          // }
          // else{
          // @ts-ignore
          value[attr] = foucsStatus;
          // }
        } else {
          // @ts-ignore
          d[r][c] = { v: value };
          // @ts-ignore
          d[r][c][attr] = foucsStatus;
        }

        // if(attr === "tr" && !_.isNil(d[r][c].tb)){
        //     d[r][c].tb = "0";
        // }
      }
    }
  }
}

function updateFormat(
  ctx: Context,
  $input: HTMLDivElement,
  d: CellMatrix,
  attr: keyof Cell,
  foucsStatus: any
) {
  //   if (!checkProtectionFormatCells(ctx.currentSheetIndex)) {
  //     return;
  //   }

  if (!ctx.allowEdit) {
    return;
  }

  // if (attr in inlineStyleAffectAttribute) {
  //   if (ctx.luckysheetCellUpdate.length > 0) {
  //     const value = $input.innerText;
  //     if (value.substring(0, 1) !== "=") {
  //       const cell =
  //         d[ctx.luckysheetCellUpdate[0]][ctx.luckysheetCellUpdate[1]];
  //       updateInlineStringFormat(
  //         cell,
  //         attr,
  //         foucsStatus,
  //         luckysheetformula.rangeResizeTo
  //       );
  //       // return;
  //     }
  //   }
  // }

  const cfg = _.cloneDeep(ctx.config);
  if (_.isNil(cfg.rowlen)) {
    cfg.rowlen = {};
  }

  _.forEach(ctx.luckysheet_select_save, (selection) => {
    const [row_st, row_ed] = selection.row;
    const [col_st, col_ed] = selection.column;

    updateFormatCell(ctx, d, attr, foucsStatus, row_st, row_ed, col_st, col_ed);

    // if (attr === "tb" || attr === "tr" || attr === "fs") {
    //   cfg = rowlenByRange(ctx, d, row_st, row_ed, cfg);
    // }
  });

  //   let allParam = {};
  //   if (attr === "tb" || attr === "tr" || attr === "fs") {
  //     allParam = {
  //       cfg,
  //       RowlChange: true,
  //     };
  //   }

  //   jfrefreshgrid(d, ctx.luckysheet_select_save, allParam, false);
}

function updateFormat_mc(ctx: Context, d: CellMatrix, foucsStatus: any) {
  // if (!checkIsAllowEdit()) {
  //   tooltip.info("", locale().pivotTable.errorNotAllowEdit);
  //   return;
  // }
  const cfg = ctx.config;
  if (cfg.merge == null) {
    cfg.merge = {};
  }

  // if (!checkProtectionNotEnable(ctx.currentSheetIndex)) {
  //   return;
  // }
  if (!ctx.luckysheet_select_save) return;

  if (foucsStatus === "mergeCancel") {
    for (let i = 0; i < ctx.luckysheet_select_save.length; i += 1) {
      const range = ctx.luckysheet_select_save[i];
      const r1 = range.row[0];
      const r2 = range.row[1];
      const c1 = range.column[0];
      const c2 = range.column[1];

      if (r1 === r2 && c1 === c2) {
        continue;
      }

      const fv: any = {};

      for (let r = r1; r <= r2; r += 1) {
        for (let c = c1; c <= c2; c += 1) {
          const cell = d[r][c];

          if (cell != null && cell.mc != null) {
            const mc_r = cell.mc.r;
            const mc_c = cell.mc.c;

            if ("rs" in cell.mc) {
              delete cell.mc;
              delete cfg.merge[`${mc_r}_${mc_c}`];

              fv[`${mc_r}_${mc_c}`] = _.cloneDeep(cell) || {};
            } else {
              // let cell_clone = fv[mc_r + "_" + mc_c];
              const cell_clone = _.cloneDeep(fv[`${mc_r}_${mc_c}`]);

              delete cell_clone.v;
              delete cell_clone.m;
              delete cell_clone.ct;
              delete cell_clone.f;
              delete cell_clone.spl;

              d[r][c] = cell_clone;
            }
          }
        }
      }
    }
  } else {
    let isHasMc = false; // 选区是否含有 合并的单元格

    for (let i = 0; i < ctx.luckysheet_select_save.length; i += 1) {
      const range = ctx.luckysheet_select_save[i];
      const r1 = range.row[0];
      const r2 = range.row[1];
      const c1 = range.column[0];
      const c2 = range.column[1];

      for (let r = r1; r <= r2; r += 1) {
        for (let c = c1; c <= c2; c += 1) {
          const cell = d[r][c];

          if (cell?.mc) {
            isHasMc = true;
            break;
          }
        }
      }
    }

    if (isHasMc) {
      // 选区有合并单元格（选区都执行 取消合并）
      for (let i = 0; i < ctx.luckysheet_select_save.length; i += 1) {
        const range = ctx.luckysheet_select_save[i];
        const r1 = range.row[0];
        const r2 = range.row[1];
        const c1 = range.column[0];
        const c2 = range.column[1];

        if (r1 === r2 && c1 === c2) {
          continue;
        }

        const fv: any = {};

        for (let r = r1; r <= r2; r += 1) {
          for (let c = c1; c <= c2; c += 1) {
            const cell = d[r][c];

            if (cell != null && cell.mc != null) {
              const mc_r = cell.mc.r;
              const mc_c = cell.mc.c;

              if ("rs" in cell.mc) {
                delete cell.mc;
                delete cfg.merge[`${mc_r}_${mc_c}`];

                fv[`${mc_r}_${mc_c}`] = _.cloneDeep(cell) || {};
              } else {
                // let cell_clone = fv[mc_r + "_" + mc_c];
                const cell_clone = _.cloneDeep(fv[`${mc_r}_${mc_c}`]);

                delete cell_clone.v;
                delete cell_clone.m;
                delete cell_clone.ct;
                delete cell_clone.f;
                delete cell_clone.spl;

                d[r][c] = cell_clone;
              }
            }
          }
        }
      }
    } else {
      for (let i = 0; i < ctx.luckysheet_select_save.length; i += 1) {
        const range = ctx.luckysheet_select_save[i];
        const r1 = range.row[0];
        const r2 = range.row[1];
        const c1 = range.column[0];
        const c2 = range.column[1];

        if (r1 === r2 && c1 === c2) {
          continue;
        }

        if (foucsStatus === "mergeAll") {
          let fv = {};
          let isfirst = false;

          for (let r = r1; r <= r2; r += 1) {
            for (let c = c1; c <= c2; c += 1) {
              const cell = d[r][c];

              if (
                cell != null &&
                (isInlineStringCT(cell.ct) ||
                  !_.isEmpty(cell.v) ||
                  cell.f != null) &&
                !isfirst
              ) {
                fv = _.cloneDeep(cell) || {};
                isfirst = true;
              }

              d[r][c] = { mc: { r: r1, c: c1 } };
            }
          }

          d[r1][c1] = fv;
          const a = d[r1][c1];
          if (!a) return;
          a.mc = { r: r1, c: c1, rs: r2 - r1 + 1, cs: c2 - c1 + 1 };

          cfg.merge[`${r1}_${c1}`] = {
            r: r1,
            c: c1,
            rs: r2 - r1 + 1,
            cs: c2 - c1 + 1,
          };
        } else if (foucsStatus === "mergeV") {
          for (let c = c1; c <= c2; c += 1) {
            let fv = {};
            let isfirst = false;

            for (let r = r1; r <= r2; r += 1) {
              const cell = d[r][c];

              if (
                cell != null &&
                (!_.isEmpty(cell.v) || cell.f != null) &&
                !isfirst
              ) {
                fv = _.cloneDeep(cell) || {};
                isfirst = true;
              }

              d[r][c] = { mc: { r: r1, c } };
            }

            d[r1][c] = fv;
            const a = d[r1][c];
            if (!a) return;
            a.mc = { r: r1, c, rs: r2 - r1 + 1, cs: 1 };

            cfg.merge[`${r1}_${c}`] = {
              r: r1,
              c,
              rs: r2 - r1 + 1,
              cs: 1,
            };
          }
        } else if (foucsStatus === "mergeH") {
          for (let r = r1; r <= r2; r += 1) {
            let fv = {};
            let isfirst = false;

            for (let c = c1; c <= c2; c += 1) {
              const cell = d[r][c];

              if (
                cell != null &&
                (!_.isEmpty(cell.v) || cell.f != null) &&
                !isfirst
              ) {
                fv = _.cloneDeep(cell) || {};
                isfirst = true;
              }

              d[r][c] = { mc: { r, c: c1 } };
            }

            d[r][c1] = fv;
            const a = d[r][c1];
            if (!a) return;
            a.mc = { r, c: c1, rs: 1, cs: c2 - c1 + 1 };

            cfg.merge[`${r}_${c1}`] = {
              r,
              c: c1,
              rs: 1,
              cs: c2 - c1 + 1,
            };
          }
        }
      }
    }
  }
}

function toggleAttr(ctx: Context, cellInput: HTMLDivElement, attr: keyof Cell) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;

  const flag = isAllSelectedCellsInStatus(ctx, attr, 1);
  const foucsStatus = flag ? 0 : 1;

  updateFormat(ctx, cellInput, flowdata, attr, foucsStatus);
}

function setAttr(
  ctx: Context,
  cellInput: HTMLDivElement,
  attr: keyof Cell,
  value: any
) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;

  updateFormat(ctx, cellInput, flowdata, attr, value);
}
// @ts-ignore
function checkNoNullValue(cell) {
  let v = cell;
  if (isPlainObject(v)) {
    v = v.v;
  }

  if (
    !isRealNull(v) &&
    isdatatypemulti(v).num &&
    (cell.ct == null ||
      cell.ct.t == null ||
      cell.ct.t === "n" ||
      cell.ct.t === "g")
  ) {
    return true;
  }

  return false;
}
// @ts-ignore
function checkNoNullValueAll(cell) {
  let v = cell;
  if (isPlainObject(v)) {
    v = v.v;
  }

  if (!isRealNull(v)) {
    return true;
  }

  return false;
}
function getNoNullValue(d: CellMatrix, st_x: number, ed: number, type: string) {
  // let hasValueSum = 0;
  let hasValueStart = null;
  let nullNum = 0;
  let nullTime = 0;

  for (let r = ed - 1; r >= 0; r -= 1) {
    let cell;
    if (type === "c") {
      cell = d[st_x][r];
    } else {
      cell = d[r][st_x];
    }

    if (checkNoNullValue(cell)) {
      // hasValueSum += 1;
      hasValueStart = r;
    } else if (cell == null || cell.v == null || cell.v === "") {
      nullNum += 1;

      if (nullNum >= 40) {
        if (nullTime <= 0) {
          nullTime = 1;
        } else {
          break;
        }
      }
    } else {
      break;
    }
  }

  return hasValueStart;
}

function activeFormulaInput(
  cellInput: HTMLDivElement,
  ctx: Context,
  row_index: number,
  col_index: number,
  rowh: any,
  columnh: any,
  formula: string,
  cache: GlobalCache,
  isnull?: boolean
) {
  if (isnull == null) {
    isnull = false;
  }

  ctx.luckysheetCellUpdate = [row_index, col_index];
  cache.doNotUpdateCell = true;
  if (isnull) {
    const formulaTxt = `<span dir="auto" class="luckysheet-formula-text-color">=</span><span dir="auto" class="luckysheet-formula-text-color">${formula.toUpperCase()}</span><span dir="auto" class="luckysheet-formula-text-color">(</span><span dir="auto" class="luckysheet-formula-text-color">)</span>`;

    cellInput.innerHTML = formulaTxt;

    const spanList = cellInput.querySelectorAll("span");
    setCaretPosition(spanList[spanList.length - 2], 0, 1);

    return;
  }

  const row_pre = rowLocationByIndex(rowh[0], ctx.visibledatarow)[0];
  const row = rowLocationByIndex(rowh[1], ctx.visibledatarow)[1];
  const col_pre = colLocationByIndex(columnh[0], ctx.visibledatacolumn)[0];
  const col = colLocationByIndex(columnh[1], ctx.visibledatacolumn)[1];

  const formulaTxt = `<span dir="auto" class="luckysheet-formula-text-color">=</span><span dir="auto" class="luckysheet-formula-text-color">${formula.toUpperCase()}</span><span dir="auto" class="luckysheet-formula-text-color">(</span><span class="luckysheet-formula-functionrange-cell" rangeindex="0" dir="auto" style="color:${
    colors[0]
  };">${getRangetxt(
    ctx,
    ctx.currentSheetIndex,
    { row: rowh, column: columnh },
    ctx.currentSheetIndex
  )}</span><span dir="auto" class="luckysheet-formula-text-color">)</span>`;
  cellInput.innerHTML = formulaTxt;

  israngeseleciton();
  formulaCache.rangestart = true;
  formulaCache.rangedrag_column_start = false;
  formulaCache.rangedrag_row_start = false;
  formulaCache.rangechangeindex = 0;
  rangeSetValue(ctx, { row: rowh, column: columnh });
  formulaCache.func_selectedrange = {
    left: col_pre,
    width: col - col_pre - 1,
    top: row_pre,
    height: row - row_pre - 1,
    left_move: col_pre,
    width_move: col - col_pre - 1,
    top_move: row_pre,
    height_move: row - row_pre - 1,
    row: [row_index, row_index],
    column: [col_index, col_index],
  };

  // $("#luckysheet-formula-functionrange-select")
  //   .css({
  //     left: col_pre,
  //     width: col - col_pre - 1,
  //     top: row_pre,
  //     height: row - row_pre - 1,
  //   })
  //   .show(); TODO！！！

  // $("#luckysheet-formula-help-c").hide();
}

function backFormulaInput(
  d: CellMatrix,
  r: number,
  c: number,
  rowh: any,
  columnh: any,
  formula: string,
  ctx: Context
) {
  const f = `=${formula.toUpperCase()}(${getRangetxt(
    ctx,
    ctx.currentSheetIndex,
    { row: rowh, column: columnh },
    ctx.currentSheetIndex
  )})`;
  const v = execfunction(ctx, f, r, c);
  const value = { v: v[1], f: v[2] };
  setCellValue(ctx, r, c, d, value);
  formulaCache.execFunctionExist.push({
    r,
    c,
    i: ctx.currentSheetIndex,
  });

  // server.historyParam(d, ctx.currentSheetIndex, {
  //   row: [r, r],
  //   column: [c, c],
  // }); 目前没有server
}

function singleFormulaInput(
  cellInput: HTMLDivElement,
  ctx: Context,
  d: CellMatrix,
  _index: number,
  fix: number,
  st_m: number,
  ed_m: number,
  formula: string,
  type: string,
  cache: GlobalCache,
  noNum?: boolean,
  noNull?: boolean
) {
  if (type == null) {
    type = "r";
  }

  if (noNum == null) {
    noNum = true;
  }

  if (noNull == null) {
    noNull = true;
  }

  let isNull = true;
  let isNum = false;

  for (let c = st_m; c <= ed_m; c += 1) {
    let cell = null;

    if (type === "c") {
      cell = d[c][fix];
    } else {
      cell = d[fix][c];
    }

    if (checkNoNullValue(cell)) {
      isNull = false;
      isNum = true;
    } else if (checkNoNullValueAll(cell)) {
      isNull = false;
    }
  }

  if (isNull && noNull) {
    let st_r_r = getNoNullValue(d, _index, fix, type);

    if (st_r_r == null) {
      if (type === "c") {
        activeFormulaInput(
          cellInput,
          ctx,
          _index,
          fix,
          null,
          null,
          formula,
          cache,
          true
        );
      } else {
        activeFormulaInput(
          cellInput,
          ctx,
          fix,
          _index,
          null,
          null,
          formula,
          cache,
          true
        );
      }
    } else {
      if (_index === st_m) {
        for (let c = st_m; c <= ed_m; c += 1) {
          st_r_r = getNoNullValue(d, c, fix, type);

          if (st_r_r == null) {
            break;
          }

          if (type === "c") {
            backFormulaInput(
              d,
              c,
              fix,
              [c, c],
              [st_r_r, fix - 1],
              formula,
              ctx
            );
          } else {
            backFormulaInput(
              d,
              fix,
              c,
              [st_r_r, fix - 1],
              [c, c],
              formula,
              ctx
            );
          }
        }
      } else {
        for (let c = ed_m; c >= st_m; c -= 1) {
          st_r_r = getNoNullValue(d, c, fix, type);

          if (st_r_r == null) {
            break;
          }

          if (type === "c") {
            backFormulaInput(
              d,
              c,
              fix,
              [c, c],
              [st_r_r, fix - 1],
              formula,
              ctx
            );
          } else {
            backFormulaInput(
              d,
              fix,
              c,
              [st_r_r, fix - 1],
              [c, c],
              formula,
              ctx
            );
          }
        }
      }
    }
    return false;
  }
  if (isNum && noNum) {
    let cell = null;

    if (type === "c") {
      cell = d[ed_m + 1][fix];
    } else {
      cell = d[fix][ed_m + 1];
    }

    /* 备注：在搜寻的时候排除自己以解决单元格函数引用自己的问题 */
    if (cell != null && cell.v != null && cell.v.toString().length > 0) {
      let c = ed_m + 1;

      if (type === "c") {
        cell = d[ed_m + 1][fix];
      } else {
        cell = d[fix][ed_m + 1];
      }

      while (cell != null && cell.v != null && cell.v.toString().length > 0) {
        c += 1;
        let len = null;

        if (type === "c") {
          len = d.length;
        } else {
          len = d[0].length;
        }

        if (c >= len) {
          return false;
        }

        if (type === "c") {
          cell = d[c][fix];
        } else {
          cell = d[fix][c];
        }
      }

      if (type === "c") {
        backFormulaInput(d, c, fix, [st_m, ed_m], [fix, fix], formula, ctx);
      } else {
        backFormulaInput(d, fix, c, [fix, fix], [st_m, ed_m], formula, ctx);
      }
    } else {
      if (type === "c") {
        backFormulaInput(
          d,
          ed_m + 1,
          fix,
          [st_m, ed_m],
          [fix, fix],
          formula,
          ctx
        );
      } else {
        backFormulaInput(
          d,
          fix,
          ed_m + 1,
          [fix, fix],
          [st_m, ed_m],
          formula,
          ctx
        );
      }
    }
    return false;
  }
  return true;
}
function autoSelectionFormula(
  ctx: Context,
  cellInput: HTMLDivElement,
  formula: string,
  cache: GlobalCache
) {
  const flowdata = getFlowdata(ctx);
  if (flowdata == null) return;
  // const nullfindnum = 40;
  let isfalse = true;
  formulaCache.execFunctionExist = [];

  function execFormulaInput_c(
    d: CellMatrix,
    st_r: number,
    ed_r: number,
    st_c: number,
    ed_c: number,
    _formula: string
  ) {
    const st_c_c = getNoNullValue(d, st_r, ed_c, "c");

    if (st_c_c == null) {
      activeFormulaInput(
        cellInput,
        ctx,
        st_r,
        st_c,
        null,
        null,
        _formula,
        cache,
        true
      );
    } else {
      activeFormulaInput(
        cellInput,
        ctx,
        st_r,
        st_c,
        [st_r, ed_r],
        [st_c_c, ed_c - 1],
        _formula,
        cache
      );
    }
  }

  function execFormulaInput(
    d: CellMatrix,
    st_r: number,
    ed_r: number,
    st_c: number,
    ed_c: number,
    _formula: string
  ) {
    const st_r_c = getNoNullValue(d, st_c, ed_r, "r");

    if (st_r_c == null) {
      execFormulaInput_c(d, st_r, ed_r, st_c, ed_c, _formula);
    } else {
      activeFormulaInput(
        cellInput,
        ctx,
        st_r,
        st_c,
        [st_r_c, ed_r - 1],
        [st_c, ed_c],
        _formula,
        cache
      );
    }
  }
  if (!ctx.luckysheet_select_save) return;

  for (let s = 0; s < ctx.luckysheet_select_save.length; s += 1) {
    const st_r = ctx.luckysheet_select_save[s].row[0];
    const ed_r = ctx.luckysheet_select_save[s].row[1];
    const st_c = ctx.luckysheet_select_save[s].column[0];
    const ed_c = ctx.luckysheet_select_save[s].column[1];
    const row_index = ctx.luckysheet_select_save[s].row_focus;
    const col_index = ctx.luckysheet_select_save[s].column_focus;

    if (st_r === ed_r && st_c === ed_c) {
      if (ed_r - 1 < 0 && ed_c - 1 < 0) {
        activeFormulaInput(
          cellInput,
          ctx,
          st_r,
          st_c,
          null,
          null,
          formula,
          cache,
          true
        );
        return;
      }

      if (ed_r - 1 >= 0 && checkNoNullValue(flowdata[ed_r - 1][st_c])) {
        execFormulaInput(flowdata, st_r, ed_r, st_c, ed_c, formula);
      } else if (ed_c - 1 >= 0 && checkNoNullValue(flowdata[st_r][ed_c - 1])) {
        execFormulaInput_c(flowdata, st_r, ed_r, st_c, ed_c, formula);
      } else {
        execFormulaInput(flowdata, st_r, ed_r, st_c, ed_c, formula);
      }
    } else if (st_r === ed_r) {
      isfalse = singleFormulaInput(
        cellInput,
        ctx,
        flowdata,
        col_index!,
        st_r,
        st_c,
        ed_c,
        formula,
        "r",
        cache
      );
    } else if (st_c === ed_c) {
      isfalse = singleFormulaInput(
        cellInput,
        ctx,
        flowdata,
        row_index!,
        st_c,
        st_r,
        ed_r,
        formula,
        "c",
        cache
      );
    } else {
      let r_false = true;
      for (let r = st_r; r <= ed_r; r += 1) {
        r_false =
          singleFormulaInput(
            cellInput,
            ctx,
            flowdata,
            col_index!,
            r,
            st_c,
            ed_c,
            formula,
            "r",
            cache,
            true,
            false
          ) && r_false;
      }

      let c_false = true;
      for (let c = st_c; c <= ed_c; c += 1) {
        c_false =
          singleFormulaInput(
            cellInput,
            ctx,
            flowdata,
            row_index!,
            c,
            st_r,
            ed_r,
            formula,
            "c",
            cache,
            true,
            false
          ) && c_false;
      }

      isfalse = !!r_false && !!c_false;
    }

    isfalse = isfalse && isfalse;
  }

  if (!isfalse) {
    formulaCache.execFunctionExist.reverse();
    // @ts-ignore
    execFunctionGroup(ctx, null, null, null, null, flowdata);
    // jfrefreshgrid(d, Store.luckysheet_select_save);

    clearTimeout(ctx.jfcountfuncTimeout);
    // ctx.jfcountfuncTimeout = setTimeout(function () {
    //   countfunc();
    // }, 500);  TODO:MAYBE!
  }
}

export function cancelPaintModel(ctx: Context) {
  // $("#luckysheet-sheettable_0").removeClass("luckysheetPaintCursor");
  if (ctx.luckysheet_copy_save === null) return;
  if (ctx.luckysheet_copy_save?.dataSheetIndex === ctx.currentSheetIndex) {
    ctx.luckysheet_selection_range = [];
    selectionCopyShow(ctx.luckysheet_selection_range, ctx);
  } else {
    if (!ctx.luckysheet_copy_save) return;
    const sheetIndex = getSheetIndex(
      ctx,
      ctx.luckysheet_copy_save.dataSheetIndex
    );
    if (!sheetIndex) return;
    // ctx.luckysheetfile[getSheetIndex(ctx.luckysheet_copy_save["dataSheetIndex"])].luckysheet_selection_range = [];
    ctx.luckysheetfile[sheetIndex].luckysheet_selection_range = [];
  }

  ctx.luckysheet_copy_save = {
    dataSheetIndex: "",
    copyRange: [{ row: [0], column: [0] }],
    RowlChange: false,
    HasMC: false,
  };

  ctx.luckysheetPaintModelOn = false;
  // $("#luckysheetpopover").fadeOut(200,function(){
  //     $("#luckysheetpopover").remove();
}
export function handleCurrencyFormat(ctx: Context, cellInput: HTMLDivElement) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;

  updateFormat(ctx, cellInput, flowdata, "ct", "¥ #.00");
}

export function handlePercentageFormat(
  ctx: Context,
  cellInput: HTMLDivElement
) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;

  updateFormat(ctx, cellInput, flowdata, "ct", "0.00%");
}

export function handleNumberDecrease(ctx: Context, cellInput: HTMLDivElement) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata || !ctx.luckysheet_select_save) return;

  const row_index = ctx.luckysheet_select_save[0].row_focus;
  const col_index = ctx.luckysheet_select_save[0].column_focus;
  if (!row_index || !col_index) return;

  let foucsStatus = normalizedAttr(flowdata, row_index, col_index, "ct");
  const cell = flowdata[row_index][col_index];

  if (foucsStatus == null || foucsStatus.t !== "n") {
    return;
  }

  if (foucsStatus.fa === "General") {
    if (!cell || !cell.v) return;

    const mask = genarate(cell.v);
    if (!mask || mask.length < 2) return;
    [, foucsStatus] = mask;
  }

  // 万亿格式
  const reg = /^(w|W)((0?)|(0\.0+))$/;
  if (reg.test(foucsStatus.fa)) {
    if (foucsStatus.fa.indexOf(".") > -1) {
      if (foucsStatus.fa.substr(-2) === ".0") {
        updateFormat(
          ctx,
          cellInput,
          flowdata,
          "ct",
          foucsStatus.fa.split(".")[0]
        );
      } else {
        updateFormat(
          ctx,
          cellInput,
          flowdata,
          "ct",
          foucsStatus.fa.substr(0, foucsStatus.fa.length - 1)
        );
      }
    } else {
      updateFormat(ctx, cellInput, flowdata, "ct", foucsStatus.fa);
    }

    return;
  }
  // Uncaught ReferenceError: Cannot access 'fa' before initialization
  let prefix = "";
  let main = "";
  let fa = [];
  if (foucsStatus.fa.indexOf(".") > -1) {
    fa = foucsStatus.fa.split(".");
    [prefix, main] = fa;
  } else {
    return;
  }

  fa = main.split("");
  let tail = "";
  for (let i = fa.length - 1; i >= 0; i -= 1) {
    const c = fa[i];
    if (c !== "#" && c !== "0" && c !== "," && Number.isNaN(parseInt(c, 10))) {
      tail = c + tail;
    } else {
      break;
    }
  }

  let fmt = "";
  if (foucsStatus.fa.indexOf(".") > -1) {
    let suffix = main;
    if (tail.length > 0) {
      suffix = main.replace(tail, "");
    }

    let pos = suffix.replace(/#/g, "0");
    pos = pos.substr(0, pos.length - 1);
    if (pos === "") {
      fmt = prefix + tail;
    } else {
      fmt = `${prefix}.${pos}${tail}`;
    }
  }

  updateFormat(ctx, cellInput, flowdata, "ct", fmt);
}

export function handleNumberIncrease(ctx: Context, cellInput: HTMLDivElement) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;
  if (!ctx.luckysheet_select_save) return;
  const row_index = ctx.luckysheet_select_save[0].row_focus;
  const col_index = ctx.luckysheet_select_save[0].column_focus;
  if (!row_index || !col_index) return;
  let foucsStatus = normalizedAttr(flowdata, row_index, col_index, "ct");
  const cell = flowdata[row_index][col_index];

  if (foucsStatus == null || foucsStatus.t !== "n") {
    return;
  }

  if (foucsStatus.fa === "General") {
    if (!cell || !cell.v) return;
    const mask = genarate(cell.v);
    if (!mask || mask.length < 2) return;
    [, foucsStatus] = mask;
  }

  if (foucsStatus.fa === "General") {
    updateFormat(ctx, cellInput, flowdata, "ct", "#.0");
    return;
  }

  // 万亿格式
  const reg = /^(w|W)((0?)|(0\.0+))$/;
  if (reg.test(foucsStatus.fa)) {
    if (foucsStatus.fa.indexOf(".") > -1) {
      updateFormat(ctx, cellInput, flowdata, "ct", `${foucsStatus.fa}0`);
    } else {
      if (foucsStatus.fa.substr(-1) === "0") {
        updateFormat(ctx, cellInput, flowdata, "ct", `${foucsStatus.fa}.0`);
      } else {
        updateFormat(ctx, cellInput, flowdata, "ct", `${foucsStatus.fa}0.0`);
      }
    }

    return;
  }

  // Uncaught ReferenceError: Cannot access 'fa' before initialization
  let prefix = "";
  let main = "";
  let fa = [];

  if (foucsStatus.fa.indexOf(".") > -1) {
    fa = foucsStatus.fa.split(".");
    [prefix, main] = fa;
  } else {
    main = foucsStatus.fa;
  }

  fa = main.split("");
  let tail = "";
  for (let i = fa.length - 1; i >= 0; i -= 1) {
    const c = fa[i];
    if (c !== "#" && c !== "0" && c !== "," && Number.isNaN(parseInt(c, 10))) {
      tail = c + tail;
    } else {
      break;
    }
  }

  let fmt = "";
  if (foucsStatus.fa.indexOf(".") > -1) {
    let suffix = main;
    if (tail.length > 0) {
      suffix = main.replace(tail, "");
    }

    let pos = suffix.replace(/#/g, "0");
    pos += "0";
    fmt = `${prefix}.${pos}${tail}`;
  } else {
    if (tail.length > 0) {
      fmt = `${main.replace(tail, "")}.0${tail}`;
    } else {
      fmt = `${main}.0${tail}`;
    }
  }

  updateFormat(ctx, cellInput, flowdata, "ct", fmt);
}

export function handleBold(ctx: Context, cellInput: HTMLDivElement) {
  toggleAttr(ctx, cellInput, "bl");
}

export function handleItalic(ctx: Context, cellInput: HTMLDivElement) {
  toggleAttr(ctx, cellInput, "it");
}

export function handleStrikeThrough(ctx: Context, cellInput: HTMLDivElement) {
  toggleAttr(ctx, cellInput, "cl");
}

export function handleUnderline(ctx: Context, cellInput: HTMLDivElement) {
  toggleAttr(ctx, cellInput, "un");
}

export function handleHorizontalAlign(
  ctx: Context,
  cellInput: HTMLDivElement,
  value: string
) {
  setAttr(ctx, cellInput, "ht", value);
}

export function handleVerticalAlign(
  ctx: Context,
  cellInput: HTMLDivElement,
  value: string
) {
  setAttr(ctx, cellInput, "vt", value);
}

export function handleFormatPainter(ctx: Context) {
  //   if (!checkIsAllowEdit()) {
  //     tooltip.info("", locale().pivotTable.errorNotAllowEdit);
  //     return
  // }

  // e.stopPropagation();

  // let _locale = locale();
  // let locale_paint = _locale.paint;

  if (
    ctx.luckysheet_select_save == null ||
    ctx.luckysheet_select_save.length === 0
  ) {
    // if(isEditMode()){
    //     alert(locale_paint.tipSelectRange);
    // }
    // else{
    //     tooltip.info("",locale_paint.tipSelectRange);
    // }
    return;
  }
  if (ctx.luckysheet_select_save.length > 1) {
    // if(isEditMode()){
    //     alert(locale_paint.tipNotMulti);
    // }
    // else{
    //     tooltip.info("",locale_paint.tipNotMulti);
    // }
    return;
  }

  // *增加了对选区范围是否为部分合并单元格的校验，如果为部分合并单元格，就阻止格式刷的下一步
  // TODO 这里也可以改为：判断到是合并单元格的一部分后，格式刷执行黏贴格式后删除范围单元格的 mc 值

  let has_PartMC = false;

  const r1 = ctx.luckysheet_select_save[0].row[0];
  const r2 = ctx.luckysheet_select_save[0].row[1];

  const c1 = ctx.luckysheet_select_save[0].column[0];
  const c2 = ctx.luckysheet_select_save[0].column[1];

  has_PartMC = hasPartMC(ctx, ctx.config, r1, r2, c1, c2);

  if (has_PartMC) {
    // *提示后中止下一步
    // tooltip.info('无法对部分合并单元格执行此操作', '');
    return;
  }

  // tooltip.popover("<i class='fa fa-paint-brush'></i> "+locale_paint.start+"", "topCenter", true, null, locale_paint.end,function(){
  cancelPaintModel(ctx);
  // });

  // $("#luckysheet-sheettable_0").addClass("luckysheetPaintCursor");

  ctx.luckysheet_selection_range = [
    {
      row: ctx.luckysheet_select_save[0].row,
      column: ctx.luckysheet_select_save[0].column,
    },
  ];

  selectionCopyShow(ctx.luckysheet_selection_range, ctx);
  let RowlChange = false;
  let HasMC = false;

  for (
    let r = ctx.luckysheet_select_save[0].row[0];
    r <= ctx.luckysheet_select_save[0].row[1];
    r += 1
  ) {
    if (ctx.config.rowhidden != null && ctx.config.rowhidden[r] != null) {
      continue;
    }

    if (ctx.config.rowlen != null && r in ctx.config.rowlen) {
      RowlChange = true;
    }

    for (
      let c = ctx.luckysheet_select_save[0].column[0];
      c <= ctx.luckysheet_select_save[0].column[1];
      c += 1
    ) {
      const flowdata = getFlowdata(ctx);
      if (!flowdata) return;
      const cell = flowdata[r][c];
      if (cell != null && cell.mc != null && cell.mc.rs != null) {
        HasMC = true;
      }
    }
  }
  ctx.luckysheet_copy_save = {
    dataSheetIndex: ctx.currentSheetIndex,
    copyRange: [
      {
        row: ctx.luckysheet_select_save[0].row,
        column: ctx.luckysheet_select_save[0].column,
      },
    ],
    RowlChange,
    HasMC,
  };

  ctx.luckysheetPaintModelOn = true;
  ctx.luckysheetPaintSingle = true;
}
export function handleClearFormat(ctx: Context) {
  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;

  _.forEach(ctx.luckysheet_select_save, (selection) => {
    const [row_st, row_ed] = selection.row;
    const [col_st, col_ed] = selection.column;

    for (let r = row_st; r <= row_ed; r += 1) {
      if (!_.isNil(ctx.config.rowhidden) && !_.isNil(ctx.config.rowhidden[r])) {
        continue;
      }

      for (let c = col_st; c <= col_ed; c += 1) {
        const cell = flowdata[r][c];
        if (!cell) continue;

        flowdata[r][c] = _.pick(cell, "v", "m", "mc", "f", "ct");
      }
    }
  });
}

export function handleTextColor(
  ctx: Context,
  cellInput: HTMLDivElement,
  color: string
) {
  setAttr(ctx, cellInput, "fc", color);
}

export function handleTextBackground(
  ctx: Context,
  cellInput: HTMLDivElement,
  color: string
) {
  setAttr(ctx, cellInput, "bg", color);
}

export function handleBorderAll(ctx: Context) {
  // *如果禁止前台编辑，则中止下一步操作
  // if (!checkIsAllowEdit()) {
  //   tooltip.info("", locale().pivotTable.errorNotAllowEdit);
  //   return;
  // }
  // if (!checkProtectionFormatCells(Store.currentSheetIndex)) {
  //   return;
  // }

  // const d = editor.deepCopyFlowData(Store.flowdata);
  // let type = $(this).attr("type");
  let type = "border-all";
  if (type == null) {
    type = "border-all";
  }

  // const subcolormenuid = "luckysheet-icon-borderColor-menuButton";
  // let color = $(`#${subcolormenuid}`).find(".luckysheet-color-selected").val();
  // let style = $("#luckysheetborderSizepreview").attr("itemvalue");

  let color = "#000000";
  let style = "1";

  if (color == null || color === "") {
    color = "#000";
  }

  if (style == null || style === "") {
    style = "1";
  }

  const cfg = ctx.config;
  if (cfg.borderInfo == null) {
    cfg.borderInfo = [];
  }

  const borderInfo = {
    rangeType: "range",
    borderType: type,
    color,
    style,
    range: _.cloneDeep(ctx.luckysheet_select_save) || [],
  };

  cfg.borderInfo.push(borderInfo);

  // server.saveParam("cg", ctx.currentSheetIndex, cfg.borderInfo, {
  //   k: "borderInfo",
  // });

  const index = getSheetIndex(ctx, ctx.currentSheetIndex);
  if (index == null) return;

  ctx.luckysheetfile[index].config = ctx.config;

  // setTimeout(function () {
  //   luckysheetrefreshgrid();
  // }, 1);
}

export function handleMergeAll(ctx: Context) {
  // if (!checkProtectionNotEnable(ctx.currentSheetIndex)) {
  //   return;
  // }

  // if (selectIsOverlap()) {
  //   if (isEditMode()) {
  //     alert("不能合并重叠区域");
  //   } else {
  //     tooltip.info("不能合并重叠区域", "");
  //   }
  //   return;
  // }

  if (ctx.config.merge != null) {
    let has_PartMC = false;
    if (!ctx.luckysheet_select_save) return;
    for (let s = 0; s < ctx.luckysheet_select_save.length; s += 1) {
      const r1 = ctx.luckysheet_select_save[s].row[0];
      const r2 = ctx.luckysheet_select_save[s].row[1];
      const c1 = ctx.luckysheet_select_save[s].column[0];
      const c2 = ctx.luckysheet_select_save[s].column[1];

      has_PartMC = hasPartMC(ctx, ctx.config, r1, r2, c1, c2);

      if (has_PartMC) {
        break;
      }
    }

    if (has_PartMC) {
      // if (isEditMode()) {
      //   alert("无法对部分合并单元格执行此操作");
      // } else {
      //   tooltip.info("无法对部分合并单元格执行此操作", "");
      // }
      return;
    }
  }

  const flowdata = getFlowdata(ctx);
  if (!flowdata) return;
  updateFormat_mc(ctx, flowdata, "mergeAll");
}

export function handleTextSize(
  ctx: Context,
  cellInput: HTMLDivElement,
  size: number
) {
  setAttr(ctx, cellInput, "fs", size);
}

export function handleSum(
  ctx: Context,
  cellInput: HTMLDivElement,
  cache?: GlobalCache
) {
  autoSelectionFormula(ctx, cellInput, "SUM", cache!);
}
const handlerMap: Record<string, ToolbarItemClickHandler> = {
  "currency-format": handleCurrencyFormat,
  "percentage-format": handlePercentageFormat,
  "number-decrease": handleNumberDecrease,
  "number-increase": handleNumberIncrease,
  "merge-all": handleMergeAll,
  "border-all": handleBorderAll,
  bold: handleBold,
  italic: handleItalic,
  "strike-through": handleStrikeThrough,
  underline: handleUnderline,
  "align-left": (ctx: Context, cellInput: HTMLDivElement) =>
    handleHorizontalAlign(ctx, cellInput, "left"),
  "align-center": (ctx: Context, cellInput: HTMLDivElement) =>
    handleHorizontalAlign(ctx, cellInput, "center"),
  "align-right": (ctx: Context, cellInput: HTMLDivElement) =>
    handleHorizontalAlign(ctx, cellInput, "right"),
  "align-top": (ctx: Context, cellInput: HTMLDivElement) =>
    handleVerticalAlign(ctx, cellInput, "top"),
  "align-mid": (ctx: Context, cellInput: HTMLDivElement) =>
    handleVerticalAlign(ctx, cellInput, "middle"),
  "align-bottom": (ctx: Context, cellInput: HTMLDivElement) =>
    handleVerticalAlign(ctx, cellInput, "bottom"),
  "clear-format": handleClearFormat,
  "format-painter": handleFormatPainter,
  "formula-sum": handleSum,
};

export function getToolbarItemClickHandler(name: string) {
  return handlerMap[name];
}