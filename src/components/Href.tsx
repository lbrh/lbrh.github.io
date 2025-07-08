import { useRouter } from 'next/router'
import React, { ReactNode } from "react";

type HrefProps = {
    href: string;
    children: ReactNode;
};

function Href({ href, children, } : HrefProps ) {
    const router = useRouter()

    const handleClick = () => {
        router.push(href)
    }

    return (
        <button onClick={handleClick}>
            {children}
        </button>
    )
}

export default Href