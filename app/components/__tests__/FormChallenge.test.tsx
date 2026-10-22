import {afterEach,describe,it,expect,vi} from "vitest";
import {render,screen,waitFor,cleanup} from "@testing-library/react";
import {useEffect,useRef} from "react";
import {FormChallenge} from "../FormChallenge";
vi.mock("next/script",()=>({default:function MockScript({onReady}:{onReady:()=>void}) { const ready=useRef(onReady); useEffect(()=>{ready.current();},[]); return null; }}));
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("form protection feedback",()=>{
 it("provides a mail fallback when setup is missing",()=>{vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","");render(<FormChallenge action="monitor" onToken={()=>{}}/>);expect(screen.getByRole("link")).toHaveAttribute("href","mailto:shimacraft8@gmail.com");});
 it("clears expired/error tokens and removes the old widget before retry",async()=>{
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","dummy-public-site-key");let callbacks:Record<string,any>={};
  const remove=vi.fn(),renderWidget=vi.fn((_el:HTMLElement,options:Record<string,any>)=>{callbacks=options;return "dummy-widget";});
  Object.assign(window,{turnstile:{render:renderWidget,remove}});const onToken=vi.fn();const view=render(<FormChallenge action="monitor" onToken={onToken}/>);
  await waitFor(()=>expect(renderWidget).toHaveBeenCalledTimes(1));callbacks.callback("dummy-token");expect(onToken).toHaveBeenLastCalledWith("dummy-token");
  callbacks["expired-callback"]();expect(onToken).toHaveBeenLastCalledWith("");
  const {act}=await import("@testing-library/react");await act(async()=>{callbacks["error-callback"]();});expect(screen.getByRole("alert")).toBeInTheDocument();
  view.rerender(<FormChallenge action="monitor" onToken={onToken} resetKey={1}/>);await waitFor(()=>expect(remove).toHaveBeenCalledWith("dummy-widget"));expect(renderWidget).toHaveBeenCalledTimes(2);delete (window as any).turnstile;
 });
});
