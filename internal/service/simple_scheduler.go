package service

import (
	"log"
	"my-bulker/internal/model"
	"my-bulker/internal/pkg/database"
	"time"

	"gorm.io/gorm"
)

type SimpleSchedulerService struct {
	db              *gorm.DB
	instanceService *InstanceService
	dbDocService    *DbDocService
	ticker          *time.Ticker
	quit            chan struct{}
}

func NewSimpleSchedulerService() *SimpleSchedulerService {
	db := database.GetDB()
	return &SimpleSchedulerService{
		db:              db,
		instanceService: NewInstanceService(),
		dbDocService:    NewDbDocService(db),
		quit:            make(chan struct{}),
	}
}

func (s *SimpleSchedulerService) Start() {
	s.ticker = time.NewTicker(1 * time.Minute)
	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.runScheduledSyncs()
			case <-s.quit:
				s.ticker.Stop()
				return
			}
		}
	}()
}

func (s *SimpleSchedulerService) Stop() {
	close(s.quit)
}

func (s *SimpleSchedulerService) runScheduledSyncs() {
	s.syncInstances()
	s.runDbDocTasks()
}

// IsScheduled 检查任务是否达到运行时间
func IsScheduled(syncInterval int, lastRunAt *time.Time) bool {
	if syncInterval == 0 {
		return false
	}

	now := time.Now()

	// 固定时间执行 (syncInterval < 0)
	// 存储格式为: -(h * 60 + m + 1)
	if syncInterval < 0 {
		totalMinutes := -syncInterval - 1
		h := totalMinutes / 60
		m := totalMinutes % 60

		// 计算今天的执行时间点
		todayRunTime := time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location())

		// 如果今天已经运行过，则检查是否到了明天的执行时间
		if lastRunAt != nil {
			// 如果上次运行时间在今天执行时间之后，说明今天已经运行过了
			if lastRunAt.After(todayRunTime) || lastRunAt.Equal(todayRunTime) {
				return false
			}
		}

		// 如果当前时间已经过了今天的执行时间点，则可以执行
		return now.After(todayRunTime) || now.Equal(todayRunTime)
	}

	// 间隔时间执行 (syncInterval > 0)
	if lastRunAt == nil {
		return true
	}
	return lastRunAt.Add(time.Duration(syncInterval) * time.Minute).Before(now)
}

func (s *SimpleSchedulerService) syncInstances() {
	var instances []model.Instance
	if err := s.db.Where("sync_interval != 0").Find(&instances).Error; err != nil {
		log.Printf("ERROR: Failed to get instances for scheduled sync: %v", err)
		return
	}

	for _, instance := range instances {
		if IsScheduled(instance.SyncInterval, instance.LastSyncAt) {
			go func(inst model.Instance) {
				err := s.instanceService.SyncDatabases([]uint{inst.ID})
				if err != nil {
					log.Printf("ERROR: Scheduled sync failed for instance %s: %v", inst.Name, err)
				}
				now := time.Now()
				updateData := map[string]interface{}{"last_sync_at": &now}
				if err := s.db.Model(&model.Instance{}).Where("id = ?", inst.ID).Updates(updateData).Error; err != nil {
					log.Printf("ERROR: Failed to update last_sync_at for instance '%s' (ID: %d): %v", inst.Name, inst.ID, err)
				}
			}(instance)
		}
	}
}

func (s *SimpleSchedulerService) runDbDocTasks() {
	var tasks []model.DbDocTask
	if err := s.db.Where("is_enable = ?", true).Where("sync_interval != 0").Find(&tasks).Error; err != nil {
		log.Printf("ERROR: Failed to get db doc tasks for scheduled run: %v", err)
		return
	}

	for _, task := range tasks {
		if IsScheduled(task.SyncInterval, task.LastRunAt) {
			go func(t model.DbDocTask) {
				if err := s.dbDocService.RunTask(t.ID); err != nil {
					log.Printf("ERROR: Failed to run db doc task '%s' (ID: %d): %v", t.TaskName, t.ID, err)
				}
				now := time.Now()
				updateData := map[string]interface{}{"last_run_at": &now}
				if err := s.db.Model(&model.DbDocTask{}).Where("id = ?", t.ID).Updates(updateData).Error; err != nil {
					log.Printf("ERROR: Failed to update last_run_at for db doc task '%s' (ID: %d): %v", t.TaskName, t.ID, err)
				}
			}(task)
		}
	}
}
