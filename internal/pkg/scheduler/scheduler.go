package scheduler

import (
	"log"
	"sync"

	"github.com/robfig/cron/v3"
)

var (
	c    *cron.Cron
	once sync.Once
	mu   sync.RWMutex
	jobs map[uint]cron.EntryID
)

// Start 启动调度器
func Start() {
	once.Do(func() {
		c = cron.New(cron.WithSeconds())
		jobs = make(map[uint]cron.EntryID)
		c.Start()
		log.Println("Scheduler started")
	})
}

// AddJob 添加或更新定时任务
func AddJob(id uint, spec string, cmd func()) error {
	mu.Lock()
	defer mu.Unlock()

	// 如果已存在，先删除旧任务
	if entryID, ok := jobs[id]; ok {
		c.Remove(entryID)
	}

	entryID, err := c.AddFunc(spec, cmd)
	if err != nil {
		return err
	}

	jobs[id] = entryID
	return nil
}

// RemoveJob 移除定时任务
func RemoveJob(id uint) {
	mu.Lock()
	defer mu.Unlock()

	if entryID, ok := jobs[id]; ok {
		c.Remove(entryID)
		delete(jobs, id)
	}
}
