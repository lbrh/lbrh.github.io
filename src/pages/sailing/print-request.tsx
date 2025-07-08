import { useEffect, useState } from "react";

export default function Home() {
    // TODO: backend and css
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [item, setItem] = useState("");

    useEffect(() => {
        const savedName = localStorage.getItem("name");
        const savedEmail = localStorage.getItem("email");
        const savedItem = localStorage.getItem("item");

        if (savedName) setName(savedName);
        if (savedEmail) setEmail(savedEmail);
        if (savedItem) setItem(savedItem);
    }, []);

    const handleSubmit = () => {
        localStorage.setItem("name", name);
        localStorage.setItem("email", email);
        localStorage.setItem("item", item);
        alert("Form submitted!");
    };

    return (
        <div className="bg-[#99c7d0] min-h-screen flex flex-col items-center justify-between">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8">
                <p>Email</p>
                <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <p>Name</p>
                <input
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <p>Item Requested</p>
                <label>
                    <input
                        type="radio"
                        name="item"
                        value="Boats"
                        checked={item === "Boats"}
                        onChange={(e) => setItem(e.target.value)}
                    />
                    Boats
                </label>
                <label>
                    <input
                        type="radio"
                        name="item"
                        value="Winch"
                        checked={item === "Winch"}
                        onChange={(e) => setItem(e.target.value)}
                    />
                    J70 Winch Cover
                </label>
                <label>
                    <input
                        type="radio"
                        name="item"
                        value="TBD"
                        checked={item === "TBD"}
                        onChange={(e) => setItem(e.target.value)}
                    />
                    TBD
                </label>

                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                    Submit
                </button>
            </form>

            <footer className="bg-[#516a6f] w-full text-white text-center py-2.5">
                <p>Hope you enjoyed my website!</p>
            </footer>
        </div>
    );
}
