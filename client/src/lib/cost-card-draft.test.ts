import { describe, expect, it } from "vitest";
import { createDraftMaterial, removeDraftMaterial, updateDraftMaterial } from "./cost-card-draft";

describe("成本卡材料草稿", () => {
  it("为每一行分配稳定 ID，名称更新不会改变 React 行身份", () => {
    const first = createDraftMaterial("件", { id: "draft-1", name: "包装盒" });
    const second = createDraftMaterial("件", { id: "draft-2", name: "贴纸" });
    const updated = updateDraftMaterial([first, second], "draft-1", { name: "包装盒（加厚）" });

    expect(updated[0]).toMatchObject({ id: "draft-1", name: "包装盒（加厚）" });
    expect(updated[1]).toBe(second);
  });

  it("按稳定 ID 删除材料行，不受输入内容或显示顺序影响", () => {
    const materials = [
      createDraftMaterial("份", { id: "draft-a", name: "食材" }),
      createDraftMaterial("份", { id: "draft-b", name: "调料" }),
    ];
    expect(removeDraftMaterial(materials, "draft-a")).toEqual([materials[1]]);
  });
});
