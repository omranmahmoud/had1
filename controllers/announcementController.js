import Announcement from '../models/Announcement.js';

export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort('order')
      .select('-__v');
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort('order')
      .select('-__v');
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const announcement = new Announcement({
      ...req.body,
      order: await Announcement.countDocuments()
    });
    const savedAnnouncement = await announcement.save();
    res.status(201).json(savedAnnouncement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json(announcement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reorderAnnouncements = async (req, res) => {
  try {
    const { announcements } = req.body;
    await Promise.all(
      announcements.map(({ id, order }) => 
        Announcement.findByIdAndUpdate(id, { order })
      )
    );
    res.json({ message: 'Announcements reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};