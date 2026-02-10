const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({ port: 6379 });
const queue = new Queue('gemini-analysis', { connection });

async function addJobs() {
  const jobs = [
    {
      name: 'analyze',
      data: {
        type: 'analyze',
        videoPath: 'data/uploads/1770605390588-0gmlcn.mp4',
        videoId: 2
      },
      opts: { jobId: 'gemini-analysis-analyze-1770605391007-retry' }
    },
    {
      name: 'extract-storylines',
      data: {
        type: 'extract-storylines',
        videoPath: 'data/uploads/1770605390588-0gmlcn.mp4',
        videoId: 2
      },
      opts: { jobId: 'gemini-analysis-extract-storylines-1770605391008-retry' }
    },
    {
      name: 'detect-highlights',
      data: {
        type: 'detect-highlights',
        videoPath: 'data/uploads/1770605390588-0gmlcn.mp4',
        videoId: 2
      },
      opts: { jobId: 'gemini-analysis-detect-highlights-1770605391009-retry' }
    }
  ];

  for (const job of jobs) {
    try {
      await queue.add(job.name, job.data, { jobId: job.opts.jobId });
      console.log('✅ 已添加到队列:', job.opts.jobId);
    } catch (err) {
      console.error('❌ 添加失败:', job.opts.jobId, err.message);
    }
  }

  await connection.quit();
  await queue.close();
  console.log('\n任务已添加到Redis队列，Workers应该会自动处理');
}

addJobs().catch(console.error);
