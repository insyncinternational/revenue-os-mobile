import { contactPatch, dialable, fullName, headline, whatsappLink } from "./contact";

describe("contactPatch", () => {
  it("never lets paid actions or unknown fields through", () => {
    const body = contactPatch({ first_name: " Sara ", enrich: true, score: true, base_id: 5, tier: "A", purpose: "x" } as never, "update");
    expect(body).toEqual({ first_name: "Sara" });
    expect(body).not.toHaveProperty("enrich");
    expect(body).not.toHaveProperty("score");
  });
  it("clears emptied fields on update, omits them on create, lower-cases email", () => {
    expect(contactPatch({ first_name: "Sara", company: "  ", email: " Sara@Northwind.AE " }, "update")).toEqual({ first_name: "Sara", company: null, email: "sara@northwind.ae" });
    expect(contactPatch({ first_name: "Sara", company: "" }, "create")).toEqual({ first_name: "Sara" });
  });
});

describe("names and numbers", () => {
  it("always has a display name", () => {
    expect(fullName({ first_name: "Sara", last_name: "Ahmed", email: null, phone: null })).toBe("Sara Ahmed");
    expect(fullName({ first_name: null, last_name: " ", email: "x@y.co", phone: null })).toBe("x@y.co");
    expect(fullName({ first_name: null, last_name: null, email: null, phone: null })).toBe("Unnamed contact");
    expect(headline({ role: "CFO", company: "Northwind" })).toBe("CFO · Northwind");
    expect(headline({ role: null, company: "Northwind" })).toBe("Northwind");
  });
  it("cleans phone numbers for dialling and WhatsApp", () => {
    expect(dialable("+971 50-123 4567")).toBe("+971501234567");
    expect(dialable("050 123+4567")).toBe("0501234567");
    expect(dialable("ext 12")).toBeNull();
    expect(whatsappLink("+971 50 123 4567")).toBe("https://wa.me/971501234567");
    expect(whatsappLink(null)).toBeNull();
  });
});
