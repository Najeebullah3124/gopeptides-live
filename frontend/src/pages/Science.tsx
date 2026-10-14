import React from 'react';
import { motion } from 'framer-motion';
import { useSEO } from '@/hooks/useSEO';
import { Icon } from '@/components/ui/Icon';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function Science() {
  useSEO({
    title: "The Science of Peptides | GoPeptides",
    description: "Learn about the mechanism of action, research applications, and clinical studies of various research peptides."
  });

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gray-50">


      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Icon name="academicCap" size={16} />
            <span>Research Hub</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            The Science Behind Peptides
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Dive into the peer-reviewed literature, mechanisms of action, and cutting-edge clinical research exploring the therapeutic potential of synthetic peptides.
          </p>
        </motion.div>

        {/* Placeholder for Science Articles */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="space-y-8"
        >
          {/* Example Article Placeholder */}
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">Metabolism</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Coming Soon</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                Understanding GLP-1 Agonists
              </h2>
              
              <p className="text-slate-600 leading-relaxed mb-6">
                A comprehensive review of how Glucagon-like peptide-1 receptor agonists influence metabolic pathways, glycemic control, and gastric emptying in clinical models. We will be publishing our full analysis and literature review here shortly.
              </p>
              
              <div className="flex items-center gap-2 text-primary font-medium">
                <span>Read Full Paper</span>
                <Icon name="arrowRight" size={16} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider">Recovery</span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Coming Soon</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                BPC-157 & Tissue Regeneration
              </h2>
              
              <p className="text-slate-600 leading-relaxed mb-6">
                Exploring the angiogenic properties and wound-healing acceleration observed in in-vitro models treated with Body Protection Compound-157. Stay tuned for our upcoming deep-dive into the clinical data.
              </p>
              
              <div className="flex items-center gap-2 text-primary font-medium">
                <span>Read Full Paper</span>
                <Icon name="arrowRight" size={16} />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-16 bg-primary/10 border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Want to contribute?</h3>
            <p className="text-slate-600">If you are a researcher publishing data on our peptides, we'd love to feature your work.</p>
          </div>
          <a href="/contact" className="px-6 py-3 bg-primary text-white font-bold rounded-xl whitespace-nowrap hover:bg-primary/90 transition-colors">
            Contact Us
          </a>
        </div>

      </div>
    </div>
  );
}

export default Science;
