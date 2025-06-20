'use client';

import { motion } from 'framer-motion';

interface MensajeEntradaBannerProps {
  content: string;
  source?: string | null;
}

const MensajeEntradaBanner: React.FC<MensajeEntradaBannerProps> = ({ content, source }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.5 }}
      className="w-full max-w-5xl my-8 p-4 rounded-lg shadow-xl text-white text-center"
    >
      <p className="text-lg italic text-gray-800">{content}</p>
      {source && (
        <cite className="block text-right text-sm text-gray-400 mt-2 not-italic">
          - {source}
        </cite>
      )}
    </motion.div>
  );
};

export default MensajeEntradaBanner;
