import SectionHeader from "./SectionHeader";
import Card from "./Card";

export default function CurrentProjects() {
    return (
        <Card>
            <SectionHeader title="What I'm Currently Up To"/>
            <ul className="list-disc pl-5 text-sm md:text-lg">
                <li>
                    <strong>PortStart.ai:</strong> Developing an AI-powered umpire system
                    for sailing. Currently focused on software aspect but looking to get
                    into hardware in the future.
                </li>
                <br/>
                <li>
                    <strong>RMIT BattleBots Website:</strong> Creating a full stack
                    website for the RMIT BattleBots team. Hosted on GitHub Pages with
                    actions for automatic deployment.
                </li>
                <br/>
                <li>
                    <strong>Open Source:</strong> Exploring IoT projects (Raspberry Pis,
                    Flipper Zero, etc) and other community developments. Once again
                    looking to expand my knowledge in hardware.
                </li>
                <br/>
                <li>
                    <strong>Custom 3D Printing:</strong> Creating solutions for
                    random issues people have, such as winch covers or whiteboard boats
                    for sailing. Currently comfortable with just tinkerCAD but have been
                    exploring Fusion.
                </li>
                <br/>
                <li>
                    <strong>HEX Ambassador:</strong> Brand ambassador for HEX
                    International, strengthening outreach and advocacy skills by promoting
                    the brand and engaging with diverse audiences.
                </li>
                <br/>
                <li>
                    <strong>President of RMIT Sailing:</strong> Founded and lead the RMIT Sailing Club since January
                    2024, fostering a vibrant community of sailing enthusiasts of any skill level.
                </li>
                <br/>
                <li>
                    <strong>More coming soon 👀</strong>
                </li>
            </ul>
        </Card>
    );
}
