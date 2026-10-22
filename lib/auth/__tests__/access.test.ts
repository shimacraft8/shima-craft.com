import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({session:vi.fn(),member:vi.fn()}));
vi.mock("../session",()=>({getVerifiedSession:mocks.session}));
vi.mock("@/lib/members/repo",()=>({getMember:mocks.member}));
import {requireAdmin,requireColorizeMember,getViewer} from "../access";
const member={uid:"dummy",email:"dummy@example.test",emailLower:"dummy@example.test",role:"user",accountStatus:"active",contractStatus:"active"};
beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({uid:"dummy",role:"admin"});mocks.member.mockResolvedValue({...member});vi.stubEnv("ADMIN_EMAIL_ALLOWLIST","");});afterEach(()=>vi.unstubAllEnvs());
describe("server-side authorization remains authoritative",()=>{
 it("rejects an anonymous visitor even when middleware was bypassed",async()=>{mocks.session.mockResolvedValue(null);await expect(requireAdmin()).rejects.toThrow("admin required");expect(mocks.member).not.toHaveBeenCalled();});
 it("does not trust admin claims in place of the stored member role",async()=>{await expect(requireAdmin()).rejects.toThrow("admin required");});
 it.each(["suspended","deleted"])("rejects a %s admin",async accountStatus=>{mocks.member.mockResolvedValue({...member,role:"admin",accountStatus});await expect(requireAdmin()).rejects.toThrow("admin required");});
 it("requires the allowlist as an additional check, never as sole permission",async()=>{mocks.member.mockResolvedValue({...member,role:"admin"});vi.stubEnv("ADMIN_EMAIL_ALLOWLIST","other@example.test");await expect(requireAdmin()).rejects.toThrow();vi.stubEnv("ADMIN_EMAIL_ALLOWLIST","dummy@example.test");expect((await requireAdmin()).uid).toBe("dummy");});
 it("blocks unpaid colorization and deleted membership",async()=>{mocks.member.mockResolvedValue({...member,contractStatus:"unpaid"});await expect(requireColorizeMember()).rejects.toThrow();mocks.member.mockResolvedValue({...member,accountStatus:"deleted"});expect(await getViewer()).toEqual({kind:"anonymous"});});
});
