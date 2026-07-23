"use client";

import { useState } from "react";
import { Phone, X, AlertTriangle } from "lucide-react";

const CRISIS_RESOURCES = [
  { name: "全国心理援助热线", phone: "400-161-9995", available: "24小时" },
  { name: "生命热线", phone: "400-821-1215", available: "24小时" },
  { name: "北京心理危机干预", phone: "010-82951332", available: "24小时" },
];

export default function CrisisBanner() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium border border-red-200 shadow-sm transition-all"
      >
        <Phone className="w-4 h-4" />
        <span className="hidden sm:inline">危机求助</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-bold">危机求助资源</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              如果你或你认识的人正处于危机中，请立即联系以下专业资源：
            </p>

            <div className="space-y-3">
              {CRISIS_RESOURCES.map((resource) => (
                <a
                  key={resource.phone}
                  href={`tel:${resource.phone}`}
                  className="block p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                >
                  <div className="font-medium text-gray-900">{resource.name}</div>
                  <div className="text-xl font-bold text-red-600 mt-1">{resource.phone}</div>
                  <div className="text-xs text-gray-500 mt-1">{resource.available}</div>
                </a>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              紧急情况请拨打 120 或前往最近医院急诊科
            </p>
          </div>
        </div>
      )}
    </>
  );
}
