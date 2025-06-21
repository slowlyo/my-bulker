package service

import (
	"context"
	"my-bulker/internal/model"
	"time"

	"gorm.io/gorm"
)

// DashboardService 仪表盘服务
type DashboardService struct {
	db *gorm.DB
}

// NewDashboardService 创建仪表盘服务
func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{db: db}
}

// DashboardStats 定义了仪表盘的统计数据结构
type DashboardStats struct {
	TotalInstances int64        `json:"total_instances"`
	TaskSummary    TaskSummary  `json:"task_summary"`
	RecentTasks    []RecentTask `json:"recent_tasks"`
	FavoriteTasks  []RecentTask `json:"favorite_tasks"`
}

// TaskSummary 任务统计摘要
type TaskSummary struct {
	Total     int64 `json:"total"`
	Pending   int64 `json:"pending"`
	Running   int64 `json:"running"`
	Completed int64 `json:"completed"`
	Failed    int64 `json:"failed"`
}

// RecentTask 最近的任务信息
type RecentTask struct {
	ID        uint      `json:"id"`
	TaskName  string    `json:"task_name"`
	Status    int8      `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// GetStats 获取仪表盘统计数据
func (s *DashboardService) GetStats(ctx context.Context) (*DashboardStats, error) {
	var totalInstances int64
	if err := s.db.WithContext(ctx).Model(&model.Instance{}).Count(&totalInstances).Error; err != nil {
		return nil, err
	}

	var taskSummary TaskSummary
	err := s.db.WithContext(ctx).Model(&model.QueryTask{}).
		Select(`
			COUNT(*) as total,
			SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending,
			SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as running,
			SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed,
			SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as failed
		`).
		Row().
		Scan(&taskSummary.Total, &taskSummary.Pending, &taskSummary.Running, &taskSummary.Completed, &taskSummary.Failed)

	if err != nil {
		return nil, err
	}

	var recentTasks []model.QueryTask
	if err := s.db.WithContext(ctx).Order("created_at desc").Limit(5).Find(&recentTasks).Error; err != nil {
		return nil, err
	}

	recentTaskItems := make([]RecentTask, len(recentTasks))
	for i, task := range recentTasks {
		recentTaskItems[i] = RecentTask{
			ID:        task.ID,
			TaskName:  task.TaskName,
			Status:    task.Status,
			CreatedAt: task.CreatedAt,
		}
	}

	// 获取常用任务
	var favoriteTasks []model.QueryTask
	if err := s.db.WithContext(ctx).Where("is_favorite = ?", true).Order("updated_at desc").Limit(5).Find(&favoriteTasks).Error; err != nil {
		return nil, err
	}

	favoriteTaskItems := make([]RecentTask, len(favoriteTasks))
	for i, task := range favoriteTasks {
		favoriteTaskItems[i] = RecentTask{
			ID:        task.ID,
			TaskName:  task.TaskName,
			Status:    task.Status,
			CreatedAt: task.CreatedAt,
		}
	}

	stats := &DashboardStats{
		TotalInstances: totalInstances,
		TaskSummary:    taskSummary,
		RecentTasks:    recentTaskItems,
		FavoriteTasks:  favoriteTaskItems,
	}

	return stats, nil
}
