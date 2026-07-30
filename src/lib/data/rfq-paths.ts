/**
 * The four conversations the RFQ page can start (spec §4).
 *
 * Extracted from RfqForm so the Suspense skeleton can render the identical
 * markup without pulling in the form — the skeleton's whole job is to occupy
 * exactly the space the real picker will, and the only way to guarantee that
 * at every viewport width is to lay out the same content.
 */
export type RfqPath = "product" | "service" | "partnership" | "career";

export const RFQ_PATHS: { key: RfqPath; title: string; desc: string }[] = [
  { key: "product", title: "Product Export RFQ", desc: "Source products with HS codes, MOQs, and a formal quotation." },
  { key: "service", title: "Service Engagement", desc: "Technology, AI, software, design, or marketing from Trivoxa Digital." },
  { key: "partnership", title: "Partnership", desc: "Manufacturing, logistics, or distribution partnerships with the Group." },
  { key: "career", title: "Careers", desc: "Join the team — see open areas and send your application." },
];
