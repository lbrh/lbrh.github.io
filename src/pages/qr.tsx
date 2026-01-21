import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Head from 'next/head';

export default function QRGenerator() {
  const [text, setText] = useState('https://example.com');
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <Head>
        <title>QR Code Generator</title>
        <meta name="description" content="Generate QR codes easily" />
      </Head>

      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            QR Code Generator
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter text or a URL below to generate your QR code.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="qr-text" className="sr-only">
                Text or URL
              </label>
              <input
                id="qr-text"
                name="text"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter text or URL"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg" ref={qrRef}>
            {text && (
              <QRCodeCanvas
                value={text}
                size={256}
                level={"H"}
                includeMargin={true}
              />
            )}
             {!text && <p className="text-gray-500">Enter text to see QR code</p>}
          </div>

          <div>
            <button
              onClick={downloadQRCode}
              disabled={!text}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                !text
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              Download QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
