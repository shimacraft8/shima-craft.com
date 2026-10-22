import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({get:vi.fn(),set:vi.fn(),configured:vi.fn(),verify:vi.fn(),verifyId:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:mocks.get,set:mocks.set})}));
vi.mock("@/lib/firebase/admin",()=>({isAdminConfigured:mocks.configured,adminAuth:()=>({verifySessionCookie:mocks.verify,verifyIdToken:mocks.verifyId})}));
import {getVerifiedSession,setSessionCookieOnStore,clearSessionCookieOnStore,verifyIdTokenStrict} from "../session";
beforeEach(()=>{vi.clearAllMocks();mocks.configured.mockReturnValue(true);mocks.get.mockReturnValue(undefined);});afterEach(()=>vi.unstubAllEnvs());
describe("Next 15 asynchronous cookie boundary",()=>{
 it("does not authenticate a missing or invalid cookie",async()=>{expect(await getVerifiedSession()).toBeNull();mocks.get.mockReturnValue({value:"fake-cookie"});mocks.verify.mockRejectedValue(Error("revoked"));expect(await getVerifiedSession()).toBeNull();expect(mocks.verify).toHaveBeenCalledWith("fake-cookie",true);});
 it("does not initialize an unconfigured admin SDK",async()=>{mocks.configured.mockReturnValue(false);expect(await getVerifiedSession()).toBeNull();expect(mocks.verify).not.toHaveBeenCalled();});
 it("checks revocation for accepted tokens",async()=>{mocks.get.mockReturnValue({value:"valid-dummy-cookie"});mocks.verify.mockResolvedValue({uid:"dummy-user"});expect(await getVerifiedSession()).toEqual({uid:"dummy-user"});mocks.verifyId.mockResolvedValue({uid:"dummy-user"});await verifyIdTokenStrict("dummy-id-token");expect(mocks.verifyId).toHaveBeenCalledWith("dummy-id-token",true);});
 it("awaits cookie storage and preserves HttpOnly/Secure/SameSite on creation and deletion",async()=>{vi.stubEnv("NODE_ENV","production");await setSessionCookieOnStore("dummy");expect(mocks.set).toHaveBeenLastCalledWith("sc_session","dummy",expect.objectContaining({httpOnly:true,secure:true,sameSite:"lax",path:"/"}));await clearSessionCookieOnStore();expect(mocks.set).toHaveBeenLastCalledWith("sc_session","",expect.objectContaining({httpOnly:true,secure:true,maxAge:0}));});
});
