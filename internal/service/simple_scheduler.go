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
	ticker          *time.Ticker
	quit            chan struct{}
}

func NewSimpleSchedulerService() *SimpleSchedulerService {
	return &SimpleSchedulerService{
		db:              database.GetDB(),
		instanceService: NewInstanceService(),
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
	var instances []model.Instance
	if err := s.db.Where("sync_interval > 0").Find(&instances).Error; err != nil {
		log.Printf("ERROR: Failed to get instances for scheduled sync: %v", err)
		return
	}

	for _, instance := range instances {
		now := time.Now()
		// 如果从未同步过，或者上次同步时间加上间隔小于等于当前时间，则执行同步
		if instance.LastSyncAt == nil || instance.LastSyncAt.Add(time.Duration(instance.SyncInterval)*time.Minute).Before(now) {
			go func(inst model.Instance) {
				err := s.instanceService.SyncDatabases([]uint{inst.ID})

				now := time.Now()
				updateData := map[string]interface{}{"last_sync_at": &now}
				if err != nil {
					log.Printf("ERROR: Failed to sync databases for instance '%s' (ID: %d): %v", inst.Name, inst.ID, err)
				}

				if err := s.db.Model(&model.Instance{}).Where("id = ?", inst.ID).Updates(updateData).Error; err != nil {
					log.Printf("ERROR: Failed to update last_sync_at for instance '%s' (ID: %d): %v", inst.Name, inst.ID, err)
				}
			}(instance)
		}
	}
}
