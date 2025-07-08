import Href from "../../components/Href";

export default function Home() {
    // TODO: CSS
    return (
        <div>
            <div className="bg-[#99c7d0] min-h-screen flex flex-col items-center justify-between">
                <div className="grid grid-cols-3 gap-4 h-max">
                    <Href href={"sailing/vkx"}>VKX File Viewer</Href>
                    <Href href={"sailing/print-request"}>3D print request</Href>
                    <Href href={"sailing/vkx"}>something else</Href>
                </div>

                <footer className="bg-[#516a6f] w-full text-white text-center py-2.5">
                    <p>Hope you enjoyed my website!</p>
                </footer>
            </div>
        </div>
    );
}
